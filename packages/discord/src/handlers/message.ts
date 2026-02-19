import { getOrCreateSession, handleMessageWithAttachments } from "../utils/session.js"
import { sendTyping } from "../utils/discord.js"
import type { Message, TextChannel, ThreadChannel } from "discord.js"

export async function handleMessage(message: Message) {
  // Skip bot messages
  if (message.author.bot) return

  const channel = message.channel
  if (!channel.isTextBased() || channel.isVoiceBased()) return

  // Check if bot is mentioned or message is in a DM
  const isMentioned = message.mentions.users.has(message.client.user?.id || "")
  const isDM = channel.isDMBased()

  if (!isMentioned && !isDM) return

  // Remove bot mention from message content
  let content = message.content
  if (isMentioned) {
    content = content.replace(new RegExp(`<@!?${message.client.user?.id}>`, "g"), "").trim()
  }

  // Skip if no content and no attachments
  if (!content && message.attachments.size === 0) return

  try {
    // Show typing indicator
    await sendTyping(channel as TextChannel | ThreadChannel)

    // Get or create session
    const session = await getOrCreateSession(message)
    if (!session) {
      await message.reply("❌ Failed to create session. Please try again.")
      return
    }

    // Show thinking reaction
    await message.react("⏳")

    // Handle message with attachments
    const parts = await handleMessageWithAttachments(message, session)

    if (parts.length === 0) {
      await message.reactions.removeAll()
      return
    }

    // Send prompt
    const result = await session.client.session.prompt({
      sessionID: session.sessionId,
      parts,
    })

    // Remove thinking reaction
    await message.reactions.removeAll()

    if (result.error) {
      await message.reply("❌ Sorry, I had trouble processing your message. Please try again.")
      return
    }

    // Build response text
    const responseText =
      result.data.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") || "I received your message but didn't have a response."

    // Send response (tool updates will come via live events)
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
  } catch (error) {
    console.error("Message handling error:", error)
    await message.reply("❌ An error occurred while processing your message.")
  }
}
