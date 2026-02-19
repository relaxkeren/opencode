import type { Message } from "discord.js"
import type { User, TextChannel, ThreadChannel, Channel } from "discord.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import {
  listSessions,
  getOrCreateSession,
  getSessionByKey,
  updateSessionAgent,
  updateSessionModel,
} from "../utils/session.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"

export interface ParsedCommand {
  command: string
  subcommand: string
  args: string[]
}

export function parseTextCommand(content: string): ParsedCommand | null {
  const trimmed = content.trim()
  console.log("[parseTextCommand] trimmed:", trimmed)
  if (!trimmed.startsWith("/")) return null

  const parts = trimmed.slice(1).split(/\s+/)
  if (parts.length === 0) return null

  const command = parts[0].toLowerCase()
  const subcommand = parts.length > 1 ? parts[1].toLowerCase() : ""
  const args = parts.slice(2)

  console.log("[parseTextCommand] command:", command, "subcommand:", subcommand, "args:", args)

  const validCommands = ["session", "agent", "model", "mcp", "status", "help", "ask", "connect"]

  if (!validCommands.includes(command)) {
    console.log("[parseTextCommand] Command not in valid list")
    return null
  }

  return { command, subcommand, args }
}

export async function handleTextCommand(message: Message, content: string): Promise<boolean> {
  console.log("[text-command] Received message with content:", content)
  const parsed = parseTextCommand(content)
  console.log("[text-command] Parsed result:", parsed)

  if (!parsed) {
    console.log("[text-command] Not a recognized command, returning false")
    return false
  }
  if (!parsed) return false

  const { command, subcommand, args } = parsed

  const userId = message.author.id
  const channel = message.channel

  if (!channel.isTextBased() || channel.isVoiceBased()) return false

  const sessionKey = channel.isDMBased()
    ? getDMSessionKey(userId)
    : getSessionKey(channel as TextChannel | ThreadChannel, userId)

  try {
    switch (command) {
      case "session":
        return await handleSessionTextCommand(message, subcommand, args, userId, channel as TextChannel | ThreadChannel)
      case "agent":
        return await handleAgentTextCommand(message, subcommand, args, sessionKey)
      case "model":
        return await handleModelTextCommand(message, subcommand, args, sessionKey)
      case "mcp":
        return await handleMcpTextCommand(message, subcommand, args, sessionKey)
      case "status":
        return await handleStatusTextCommand(message, sessionKey)
      case "help":
        return await handleHelpTextCommand(message)
      case "ask":
        return await handleAskTextCommand(message)
      case "connect":
        return await handleConnectTextCommand(message)
      default:
        return false
    }
  } catch (error) {
    console.error("[text-command] ❌ Text command error:", error)
    await message.reply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
    return true
  }
}

async function handleSessionTextCommand(
  message: Message,
  subcommand: string,
  args: string[],
  userId: string,
  channel: TextChannel | ThreadChannel,
): Promise<boolean> {
  switch (subcommand) {
    case "create": {
      const title = args[0]
      const session = await getOrCreateSession({
        author: message.author,
        channel,
        content: "",
        attachments: new Map(),
      } as any)

      if (!session) {
        console.error("[text-command] ❌ Failed to create session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to create session")],
        })
        return true
      }

      if (title) {
        await session.client.session.update({
          sessionID: session.sessionId,
          title,
        })
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Created", `Session ID: ${session.sessionId}`)],
      })
      return true
    }

    case "list": {
      const sessions = listSessions(userId)
      if (sessions.length === 0) {
        await message.reply({
          embeds: [createInfoEmbed("No Sessions", "You have no active sessions")],
        })
        return true
      }

      const sessionList = sessions
        .map((s) => `• ${s.sessionId} (Last active: ${s.lastActivity.toLocaleString()})`)
        .join("\n")
      await message.reply({
        embeds: [createInfoEmbed("Your Sessions", sessionList)],
      })
      return true
    }

    case "attach": {
      const sessionId = args[0]
      if (!sessionId) {
        await message.reply({
          embeds: [createErrorEmbed("Usage: /session attach <id>")],
        })
        return true
      }

      const session = await getOrCreateSession(
        {
          author: message.author,
          channel,
          content: "",
          attachments: new Map(),
        } as any,
        sessionId,
      )

      if (!session) {
        console.error("[text-command] ❌ Failed to attach to session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to attach to session")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Attached", `Attached to session: ${sessionId}`)],
      })
      return true
    }

    case "share": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      const result = await session.client.session.share({
        sessionID: session.sessionId,
      })

      if (result.error || !result.data?.share?.url) {
        console.error("[text-command] ❌ Failed to share session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to share session")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Shared", result.data.share.url)],
      })
      return true
    }

    case "unshare": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      const result = await session.client.session.unshare({
        sessionID: session.sessionId,
      })

      if (result.error) {
        console.error("[text-command] ❌ Failed to unshare session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to unshare session")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Unshared")],
      })
      return true
    }

    case "rename": {
      const name = args[0]
      if (!name) {
        await message.reply({
          embeds: [createErrorEmbed("Usage: /session rename <name>")],
        })
        return true
      }

      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      const result = await session.client.session.update({
        sessionID: session.sessionId,
        title: name,
      })

      if (result.error) {
        console.error("[text-command] ❌ Failed to rename session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to rename session")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Renamed", `New name: ${name}`)],
      })
      return true
    }

    case "compact": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      await message.reply({
        embeds: [createInfoEmbed("Compacting...", "Summarizing session...")],
      })

      const result = await session.client.session.summarize({
        sessionID: session.sessionId,
      })

      if (result.error) {
        console.error("[text-command] ❌ Failed to compact session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to compact session")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Compacted")],
      })
      return true
    }

    case "undo": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      const result = await session.client.session.revert({
        sessionID: session.sessionId,
      })

      if (result.error) {
        console.error("[text-command] ❌ Failed to undo session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to undo")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Undo Successful")],
      })
      return true
    }

    case "redo": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      const result = await session.client.session.unrevert({
        sessionID: session.sessionId,
      })

      if (result.error) {
        console.error("[text-command] ❌ Failed to redo session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to redo")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Redo Successful")],
      })
      return true
    }

    case "export": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      await message.reply({
        embeds: [createInfoEmbed("Exporting...", "Generating Markdown export...")],
      })

      const messagesResult = await session.client.session.messages({
        sessionID: session.sessionId,
        limit: 100,
      })

      if (messagesResult.error || !messagesResult.data) {
        await message.reply({
          embeds: [createErrorEmbed("Failed to export session")],
        })
        return true
      }

      let markdown = `# Session Export\n\n**Session ID:** ${session.sessionId}\n\n---\n\n`
      for (const msg of messagesResult.data) {
        markdown += `## ${msg.info.role === "user" ? "User" : "Assistant"}\n\n`
        for (const part of msg.parts) {
          if (part.type === "text") {
            markdown += `${part.text}\n\n`
          }
        }
        markdown += `---\n\n`
      }

      const buffer = Buffer.from(markdown, "utf-8")
      await message.reply({
        content: "📄 Session exported:",
        files: [
          {
            attachment: buffer,
            name: `session-${session.sessionId}.md`,
          },
        ],
      })
      return true
    }

    case "copy": {
      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      await message.reply({
        embeds: [createInfoEmbed("Copying...", "Retrieving transcript...")],
      })

      const messagesResult = await session.client.session.messages({
        sessionID: session.sessionId,
        limit: 100,
      })

      if (messagesResult.error || !messagesResult.data) {
        console.error("[text-command] ❌ Failed to copy session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to copy session")],
        })
        return true
      }

      let transcript = ""
      for (const msg of messagesResult.data) {
        transcript += `${msg.info.role === "user" ? "User" : "Assistant"}:\n`
        for (const part of msg.parts) {
          if (part.type === "text") {
            transcript += `${part.text}\n`
          }
        }
        transcript += `\n`
      }

      if (transcript.length > 1900) {
        const buffer = Buffer.from(transcript, "utf-8")
        await message.reply({
          content: "📄 Session transcript:",
          files: [
            {
              attachment: buffer,
              name: `transcript-${session.sessionId}.txt`,
            },
          ],
        })
      } else {
        await message.reply({
          content: `\`\`\`\n${transcript}\n\`\`\``,
        })
      }
      return true
    }

    case "fork": {
      const messageId = args[0]
      if (!messageId) {
        await message.reply({
          embeds: [createErrorEmbed("Usage: /session fork <message_id>")],
        })
        return true
      }

      const session = await getSessionByKey(
        channel.isDMBased() ? getDMSessionKey(userId) : getSessionKey(channel, userId),
      )
      if (!session) {
        await message.reply({
          embeds: [createErrorEmbed("No active session in this channel")],
        })
        return true
      }

      const result = await session.client.session.fork({
        sessionID: session.sessionId,
        messageID: messageId,
      })

      if (result.error || !result.data) {
        console.error("[text-command] ❌ Failed to fork session.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to fork session")],
        })
        return true
      }

      await message.reply({
        embeds: [createSuccessEmbed("Session Forked", `New session ID: ${result.data.id}`)],
      })
      return true
    }

    default:
      return false
  }
}

async function handleAgentTextCommand(
  message: Message,
  subcommand: string,
  args: string[],
  sessionKey: string,
): Promise<boolean> {
  const session = await getSessionByKey(sessionKey)
  if (!session) {
    await message.reply({
      embeds: [createErrorEmbed("No active session in this channel. Create one first with /session create")],
    })
    return true
  }

  switch (subcommand) {
    case "list": {
      const result = await session.client.app.agents()
      if (result.error || !result.data) {
        await message.reply({
          embeds: [createErrorEmbed("Failed to list agents")],
        })
        return true
      }

      const agents = result.data
        .filter((a: any) => !a.hidden && a.mode !== "subagent")
        .map((a: any) => `• **${a.name}** - ${a.description || "No description"} (${a.mode})`)
        .join("\n")

      await message.reply({
        embeds: [createInfoEmbed("Available Agents", agents || "No agents found")],
      })
      return true
    }

    case "switch": {
      const agentName = args[0]
      if (!agentName) {
        await message.reply({
          embeds: [createErrorEmbed("Usage: /agent switch <name>")],
        })
        return true
      }

      const result = await session.client.app.agents()
      if (result.error || !result.data) {
        console.error("[text-command] ❌ Failed to list agents.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to list agents")],
        })
        return true
      }

      const agent = result.data.find((a: any) => a.name === agentName)
      if (!agent) {
        await message.reply({
          embeds: [createErrorEmbed(`Agent "${agentName}" not found. Use /agent list to see available agents.`)],
        })
        return true
      }

      updateSessionAgent(sessionKey, agentName)
      await message.reply({
        embeds: [createSuccessEmbed("Agent Switched", `Active agent set to: ${agentName}`)],
      })
      return true
    }

    default:
      return false
  }
}

async function handleModelTextCommand(
  message: Message,
  subcommand: string,
  args: string[],
  sessionKey: string,
): Promise<boolean> {
  const session = await getSessionByKey(sessionKey)
  if (!session) {
    await message.reply({
      embeds: [createErrorEmbed("No active session in this channel. Create one first with /session create")],
    })
    return true
  }

  switch (subcommand) {
    case "list": {
      const result = await session.client.provider.list()
      if (result.error || !result.data) {
        console.error("[text-command] ❌ Failed to list models.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to list models")],
        })
        return true
      }

      let modelList = ""
      for (const provider of result.data.all) {
        const models = Object.entries(provider.models)
          .map(([id, info]: [string, any]) => `  • ${id} - ${info.name || id}`)
          .join("\n")
        modelList += `**${provider.name}**\n${models}\n\n`
      }

      if (modelList.length > 1900) {
        const buffer = Buffer.from(modelList, "utf-8")
        await message.reply({
          content: "📄 Available models:",
          files: [
            {
              attachment: buffer,
              name: "models.txt",
            },
          ],
        })
      } else {
        await message.reply({
          embeds: [createInfoEmbed("Available Models", modelList || "No models found")],
        })
      }
      return true
    }

    case "switch": {
      const providerID = args[0]
      const modelID = args[1]
      if (!providerID || !modelID) {
        await message.reply({
          embeds: [createErrorEmbed("Usage: /model switch <provider> <model>")],
        })
        return true
      }

      const result = await session.client.provider.list()
      if (result.error || !result.data) {
        console.error("[text-command] ❌ Failed to list providers.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to list providers")],
        })
        return true
      }

      const provider = result.data.all.find((p: any) => p.id === providerID)
      if (!provider) {
        await message.reply({
          embeds: [createErrorEmbed(`Provider "${providerID}" not found`)],
        })
        return true
      }

      if (!provider.models[modelID]) {
        await message.reply({
          embeds: [createErrorEmbed(`Model "${modelID}" not found for provider "${providerID}"`)],
        })
        return true
      }

      updateSessionModel(sessionKey, { providerID, modelID })
      await message.reply({
        embeds: [createSuccessEmbed("Model Switched", `Active model set to: ${providerID}/${modelID}`)],
      })
      return true
    }

    default:
      return false
  }
}

async function handleMcpTextCommand(
  message: Message,
  subcommand: string,
  args: string[],
  sessionKey: string,
): Promise<boolean> {
  const session = await getSessionByKey(sessionKey)
  if (!session) {
    await message.reply({
      embeds: [createErrorEmbed("No active session in this channel. Create one first with /session create")],
    })
    return true
  }

  switch (subcommand) {
    case "list": {
      const result = await session.client.mcp.status()
      if (result.error || !result.data) {
        await message.reply({
          embeds: [createErrorEmbed("Failed to list MCP integrations")],
        })
        return true
      }

      const mcps = Object.entries(result.data)
        .map(([name, status]: [string, any]) => {
          const statusEmoji = status.status === "connected" ? "✅" : "❌"
          return `${statusEmoji} **${name}** - ${status.status}`
        })
        .join("\n")

      await message.reply({
        embeds: [createInfoEmbed("MCP Integrations", mcps || "No MCP integrations found")],
      })
      return true
    }

    case "toggle": {
      const mcpName = args[0]
      if (!mcpName) {
        await message.reply({
          embeds: [createErrorEmbed("Usage: /mcp toggle <name>")],
        })
        return true
      }

      const statusResult = await session.client.mcp.status()
      if (statusResult.error || !statusResult.data) {
        console.error("[text-command] ❌ Failed to get MCP status.")
        await message.reply({
          embeds: [createErrorEmbed("Failed to get MCP status")],
        })
        return true
      }

      const mcpStatus = statusResult.data[mcpName]
      if (!mcpStatus) {
        await message.reply({
          embeds: [createErrorEmbed(`MCP "${mcpName}" not found. Use /mcp list to see available integrations.`)],
        })
        return true
      }

      if (mcpStatus.status === "connected") {
        const result = await session.client.mcp.disconnect({ name: mcpName })
        if (result.error) {
          console.error("[text-command] ❌ Failed to disable MCP.")
          await message.reply({
            embeds: [createErrorEmbed(`Failed to disable MCP: ${mcpName}`)],
          })
          return true
        }
        await message.reply({
          embeds: [createSuccessEmbed("MCP Disabled", `${mcpName} has been disabled`)],
        })
      } else {
        const result = await session.client.mcp.connect({ name: mcpName })
        if (result.error) {
          console.error("[text-command] ❌ Failed to enable MCP.")
          await message.reply({
            embeds: [createErrorEmbed(`Failed to enable MCP: ${mcpName}`)],
          })
          return true
        }
        await message.reply({
          embeds: [createSuccessEmbed("MCP Enabled", `${mcpName} has been enabled`)],
        })
      }
      return true
    }

    default:
      return false
  }
}

async function handleStatusTextCommand(message: Message, sessionKey: string): Promise<boolean> {
  const session = await getSessionByKey(sessionKey)

  if (!session) {
    await message.reply({
      embeds: [createInfoEmbed("Status", "No active session in this channel.\nServer: ✅ Online")],
    })
    return true
  }

  const statusResult = await session.client.session.status()
  if (statusResult.error || !statusResult.data) {
    console.error("[text-command] ❌ Failed to get session status.")
    await message.reply({
      embeds: [createErrorEmbed("Failed to get session status")],
    })
    return true
  }

  const sessionStatus = statusResult.data[session.sessionId]
  let msg = "**OpenCode Server:** ✅ Online\n\n"
  msg += `**Current Session:**\n`
  msg += `• ID: ${session.sessionId}\n`
  msg += `• Status: ${sessionStatus || "idle"}\n`
  msg += `• Last Activity: ${session.lastActivity.toLocaleString()}\n`
  if (session.agent) {
    msg += `• Agent: ${session.agent}\n`
  }
  if (session.model) {
    msg += `• Model: ${session.model.providerID}/${session.model.modelID}\n`
  }

  await message.reply({
    embeds: [createInfoEmbed("Status", msg)],
  })
  return true
}

async function handleHelpTextCommand(message: Message): Promise<boolean> {
  const helpText = `
**OpenCode Discord Bot - Commands**

**General:**
• "/ask <question>" - Quick question without creating a thread
• "/help" - Show this help message
• "/status" - Check opencode server and session status
• "/connect" - Connect AI provider (OAuth or instructions)

**Session Management:**
• "/session create [title]" - Create a new session
• "/session list" - List your active sessions
• "/session attach <id>" - Attach to an existing session
• "/session share" - Get shareable link to current session
• "/session unshare" - Revoke share link
• "/session rename <name>" - Rename current session
• "/session compact" - Summarize session to reduce context
• "/session undo" - Undo last message and revert changes
• "/session redo" - Redo previously undone message
• "/session export" - Export session as Markdown file
• "/session copy" - Copy session transcript
• "/session fork <message_id>" - Start new session from message

**Agent & Model:**
• "/agent list" - List available agents
• "/agent switch <name>" - Switch active agent
• "/model list" - List available models
• "/model switch <provider> <model>" - Switch model

**MCP Tools:**
• "/mcp list" - List MCP integrations
• "/mcp toggle <name>" - Enable/disable MCP

**Tips:**
• Use DMs for private conversations
• In channels, the bot creates threads for organization
• You can upload files for the AI to analyze
• Sessions persist across Discord restarts (stored on server)
`

  await message.reply({
    embeds: [createInfoEmbed("Help", helpText)],
  })
  return true
}

async function handleAskTextCommand(message: Message): Promise<boolean> {
  const content = message.content.replace(/^\/ask\s*/, "").trim()
  if (!content) {
    await message.reply({
      embeds: [createErrorEmbed("Usage: /ask <question>")],
    })
    return true
  }

  const channel = message.channel
  const session = await getOrCreateSession({
    author: message.author,
    channel,
    content,
    attachments: new Map(),
  } as any)

  if (!session) {
    await message.reply({
      embeds: [createErrorEmbed("Failed to create session. Please try again.")],
    })
    return true
  }

  await message.react("⏳")

  const result = await session.client.session.prompt({
    path: { id: session.sessionId },
    body: {
      ...(session.model ? { model: session.model } : {}),
      parts: [{ type: "text", text: content }],
    },
  })

  await message.reactions.removeAll().catch(() => {})

  if (result.error) {
    await message.reply({
      embeds: [createErrorEmbed("Sorry, I had trouble processing your question. Please try again.")],
    })
    return true
  }

  const textParts = result.data?.parts?.filter((p: any) => p.type === "text") || []
  const responseText =
    textParts.length > 0
      ? textParts.map((p: any) => p.text).join("\n")
      : "I received your message but didn't have a response."

  if (responseText.length > 1900) {
    const buffer = Buffer.from(responseText, "utf-8")
    await message.reply({
      content: "📄 Response:",
      files: [
        {
          attachment: buffer,
          name: "response.txt",
        },
      ],
    })
  } else {
    await message.reply(responseText)
  }
  return true
}

async function handleConnectTextCommand(message: Message): Promise<boolean> {
  await message.reply({
    content: `To connect an AI provider:\n\n1. Create a config file at \`~/.config/opencode/opencode.json\`:\n\`\`\`json\n{\n  "$schema": "https://opencode.ai/config.json",\n  "model": "moonshotai/kimi-k2.5"\n}\n\`\`\`\n\n2. Add your auth keys to \`~/.local/share/opencode/auth.json\`:\n\`\`\`json\n{\n  "moonshotai": {\n    "type": "api",\n    "key": "sk-..."\n  }\n}\n\`\`\`\n\nFor more providers, check: <https://opencode.ai/docs/providers>`,
  })
  return true
}
