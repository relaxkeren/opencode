import { getOrCreateSession, handleMessageWithAttachments } from "../utils/session.js"
import { sendTyping } from "../utils/discord.js"
import { handleTextCommand } from "../utils/text-command.js"
import type { Message, TextChannel, ThreadChannel } from "discord.js"
import { ConfigManager } from "../config/manager.js"
import { PairingStore } from "../security/pairing.js"

export async function handleMessage(message: Message, _config?: ConfigManager, _pairing?: PairingStore) {
  const msgId = Math.random().toString(36).slice(2, 8)
  console.log(`[message:${msgId}] ==== NEW MESSAGE ====`)
  console.log(`[message:${msgId}] Raw content:`, message.content)

  // Skip bot messages
  if (message.author.bot) {
    console.log(`[message:${msgId}] RETURN: bot message`)
    return
  }

  const channel = message.channel
  if (!channel.isTextBased() || channel.isVoiceBased()) {
    console.log(`[message:${msgId}] RETURN: not text based`)
    return
  }

  // Check if bot is mentioned or message is in a DM
  const isMentioned = message.mentions.users.has(message.client.user?.id || "")
  const isDM = channel.isDMBased()

  if (!isMentioned && !isDM) {
    console.log(`[message:${msgId}] RETURN: not mentioned and not DM`)
    return
  }

  // Remove bot mention from message content
  let content = message.content
  if (isMentioned) {
    content = content.replace(new RegExp(`<@!?${message.client.user?.id}>`, "g"), "").trim()
  }

  console.log(`[message:${msgId}] Cleaned content:`, content)

  // Skip if no content and no attachments
  if (!content && message.attachments.size === 0) {
    console.log(`[message:${msgId}] RETURN: no content and no attachments`)
    return
  }

  // Check for text command first (e.g., /session list)
  let commandHandled = false
  try {
    commandHandled = await handleTextCommand(message, content)
  } catch (err) {
    console.error(`[message:${msgId}] ❌ Error in handleTextCommand:`, err)
  }
  console.log(`[message:${msgId}] commandHandled:`, commandHandled)
  if (commandHandled === true) {
    console.log(`[message:${msgId}] RETURN: command handled - exiting early`)
    return
  }

  console.log(`[message:${msgId}] Proceeding to LLM path (no command matched)`)
  try {
    // Show typing indicator
    await sendTyping(channel as TextChannel | ThreadChannel)

    // Get or create session
    const session = await getOrCreateSession(message)
    if (!session) {
      console.error(`[message:${msgId}] ❌ Failed to create session.`)
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
      sessionID: session.sessionId,
      ...(session.model ? { model: session.model } : {}),
      parts,
    })

    console.log("📤 Full SDK response:", JSON.stringify(result, null, 2))

    // Remove thinking reaction (skip in DMs)
    if (!isDM) {
      await message.reactions.removeAll().catch(() => {})
    }

    if (result.error) {
      console.error(`[message:${msgId}] ❌ Prompt error:`, result.error)
      await message.reply("❌ Sorry, I had trouble processing your message. Please try again.")
      return
    }

    // Build response text - extract from parts array
    console.log("📊 Full response:", JSON.stringify(result, null, 2))
    const response = result.data
    if (!response) {
      console.error(`[message:${msgId}] ❌ No response received.`)
      await message.reply("❌ No response received.")
      return
    }

    // Extract text from parts - filter for text type parts
    const textParts = response.parts?.filter((p: any) => p.type === "text") || []
    const responseText =
      textParts.length > 0
        ? textParts.map((p: any) => p.text).join("\n")
        : "I received your message but didn't have a response."

    // Send response (tool updates will come via live events)
    if (responseText.length > 1900) {
      const buffer = Buffer.from(responseText, "utf-8")
      console.log(`[message:${msgId}] Sending response with attachments`)
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
      console.log(`[message:${msgId}] Sending response:`, responseText)
      await message.reply(responseText)
    }
  } catch (error) {
    console.error(`[message:${msgId}] ❌ Message handling error:`, error)
    await message.reply("❌ An error occurred while processing your message.")
  }
}
