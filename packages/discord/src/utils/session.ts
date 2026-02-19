import { getSessionKey, getDMSessionKey, downloadAttachment } from "./discord.js"
import type { SessionData } from "../types/index.js"
import { createOpencode } from "@opencode-ai/sdk"
import type { TextChannel, ThreadChannel, Message } from "discord.js"

const sessions = new Map<string, SessionData>()

export async function getOrCreateSession(message: Message, existingSessionId?: string): Promise<SessionData | null> {
  const userId = message.author.id
  const channel = message.channel

  if (!channel.isTextBased() || channel.isVoiceBased()) return null

  const sessionKey = channel.isDMBased()
    ? getDMSessionKey(userId)
    : getSessionKey(channel as TextChannel | ThreadChannel, userId)

  // Check for existing session
  const existing = sessions.get(sessionKey)
  if (existing) {
    existing.lastActivity = new Date()
    return existing
  }

  // Create new opencode instance
  console.log("🚀 Starting opencode server...")
  const opencode = await createOpencode({ port: 0 })
  console.log("✅ Opencode server ready")

  const { client, server } = opencode

  let sessionId: string

  if (existingSessionId) {
    // Attach to existing session
    sessionId = existingSessionId
    console.log(`🔗 Attaching to existing session: ${sessionId}`)
  } else {
    // Create new session
    console.log("🆕 Creating new opencode session...")
    const createResult = await client.session.create({
      body: { title: `Discord session ${new Date().toISOString()}` },
    })

    if (createResult.error) {
      console.error("❌ Failed to create session:", createResult.error)
      server.close()
      return null
    }

    sessionId = createResult.data.id
    console.log("✅ Created opencode session:", sessionId)

    // Share session and send link
    const shareResult = await client.session.share({ sessionID: sessionId } as any)
    if (!shareResult.error && shareResult.data?.share?.url) {
      const sendableChannel = channel as any
      await sendableChannel.send(`🔗 Session link: ${shareResult.data.share.url}`)
    }
  }

  const session: SessionData = {
    sessionId,
    client: client as any,
    server,
    channelId: channel.id,
    userId,
    lastActivity: new Date(),
  }

  sessions.set(sessionKey, session)

  // Subscribe to events for this session
  subscribeToEvents(session, channel as TextChannel | ThreadChannel)

  return session
}

export async function getSessionByKey(sessionKey: string): Promise<SessionData | undefined> {
  return sessions.get(sessionKey)
}

export function deleteSession(sessionKey: string): void {
  const session = sessions.get(sessionKey)
  if (session) {
    session.server.close()
    sessions.delete(sessionKey)
  }
}

export function listSessions(userId: string): SessionData[] {
  return Array.from(sessions.values()).filter((s) => s.userId === userId)
}

export function updateSessionAgent(sessionKey: string, agent: string): void {
  const session = sessions.get(sessionKey)
  if (session) {
    session.agent = agent
  }
}

export function updateSessionModel(sessionKey: string, model: { providerID: string; modelID: string }): void {
  const session = sessions.get(sessionKey)
  if (session) {
    session.model = model
  }
}

async function subscribeToEvents(session: SessionData, channel: TextChannel | ThreadChannel) {
  try {
    const events = await session.client.event.subscribe()

    for await (const event of events.stream) {
      if (event.type === "message.part.updated") {
        const part = event.properties.part

        // Only handle events for our session
        if (part.sessionID !== session.sessionId) continue

        if (part.type === "tool" && part.state.status === "completed") {
          // Show tool execution
          const toolMessage = `🔧 **${part.tool}** - ${part.state.title || "Completed"}`
          await channel.send(toolMessage).catch(() => {})
        }
      }

      if (event.type === "permission.asked") {
        const request = event.properties
        if (request.sessionID !== session.sessionId) continue

        // Handle permission request
        const patterns = request.patterns.join(", ")
        await channel
          .send(
            `⚠️ **Permission Request**\n` +
              `Tool: ${request.permission}\n` +
              `Patterns: ${patterns}\n` +
              `Use the TUI or web interface to approve/reject.`,
          )
          .catch(() => {})
      }
    }
  } catch (error) {
    console.error("Event subscription error:", error)
  }
}

export async function handleMessageWithAttachments(
  message: Message,
  session: SessionData,
): Promise<Array<{ type: "text"; text: string }>> {
  const parts: Array<{ type: "text"; text: string }> = []

  // Add text content
  if (message.content) {
    parts.push({ type: "text", text: message.content })
  }

  // Handle attachments - include as text for now
  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      try {
        const content = await downloadAttachment(attachment.url)
        parts.push({
          type: "text",
          text: `\n\n[File: ${attachment.name}]\n\`\`\`\n${content}\n\`\`\``,
        })
      } catch (error) {
        console.error(`Failed to download attachment ${attachment.name}:`, error)
        parts.push({
          type: "text",
          text: `\n\n[Failed to load attachment: ${attachment.name}]`,
        })
      }
    }
  }

  return parts
}
