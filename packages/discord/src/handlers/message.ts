import { getOrCreateSession, handleMessageWithAttachments } from "../utils/session.js"
import { sendTyping } from "../utils/discord.js"
import type { Message, TextChannel, ThreadChannel } from "discord.js"
import { ConfigManager } from "../config/manager.js"
import { PairingStore } from "../security/pairing.js"

export async function handleMessage(message: Message, _config?: ConfigManager, _pairing?: PairingStore) {
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
      // Remove thinking reaction (skip in DMs)
      if (!isDM) {
        await message.reactions.removeAll().catch(() => {})
      }
      return
    }

    // Send prompt
    console.log("Sending prompt with sessionID:", session.sessionId)
    console.log("Parts:", JSON.stringify(parts, null, 2))
    console.log("Model:", JSON.stringify(session.model))
    const result = await session.client.session.prompt({
      path: { id: session.sessionId },
      body: {
        ...(session.model ? { model: session.model } : {}),
        parts,
      },
    })

    console.log("📤 Full SDK response:", JSON.stringify(result, null, 2))

    // Remove thinking reaction (skip in DMs)
    if (!isDM) {
      await message.reactions.removeAll().catch(() => {})
    }

    if (result.error) {
      console.error("Prompt error:", result.error)
      await message.reply("❌ Sorry, I had trouble processing your message. Please try again.")
      return
    }

    // Build response text - check both info.content and parts (matching Slack integration)
    console.log("📊 result.data:", JSON.stringify(result.data, null, 2))
    console.log("📊 result.data.parts:", JSON.stringify(result.data?.parts, null, 2))
    console.log("📊 result.data.info:", JSON.stringify(result.data?.info, null, 2))
    const response = result.data
    const responseText =
      response.info?.content ||
      response.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") ||
      "I received your message but didn't have a response."

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
