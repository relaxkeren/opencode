import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import {
  getOrCreateSession,
  listSessions,
  deleteSession,
  getSessionByKey,
  updateSessionAgent,
  createOpencodeServer,
} from "../utils/session.js"
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from "../utils/discord.js"
import { getSessionKey, getDMSessionKey } from "../utils/discord.js"
import type { TextChannel, ThreadChannel } from "discord.js"

export const sessionCommand = new SlashCommandBuilder()
  .setName("session")
  .setDescription("Session management commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Create a new session")
      .addStringOption((option) => option.setName("title").setDescription("Session title").setRequired(false)),
  )
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all your sessions from the database"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("attach")
      .setDescription("Attach to an existing session")
      .addStringOption((option) => option.setName("id").setDescription("Session ID").setRequired(true)),
  )
  .addSubcommand((subcommand) => subcommand.setName("share").setDescription("Get shareable link to current session"))
  .addSubcommand((subcommand) => subcommand.setName("unshare").setDescription("Revoke share link for current session"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("rename")
      .setDescription("Rename current session")
      .addStringOption((option) => option.setName("name").setDescription("New session name").setRequired(true)),
  )
  .addSubcommand((subcommand) => subcommand.setName("compact").setDescription("Summarize session to reduce context"))
  .addSubcommand((subcommand) =>
    subcommand.setName("undo").setDescription("Undo last user message and revert file changes"),
  )
  .addSubcommand((subcommand) => subcommand.setName("redo").setDescription("Redo previously undone message"))
  .addSubcommand((subcommand) => subcommand.setName("export").setDescription("Export session as Markdown file"))
  .addSubcommand((subcommand) => subcommand.setName("copy").setDescription("Copy session transcript"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("fork")
      .setDescription("Start new session from a message")
      .addStringOption((option) =>
        option.setName("message_id").setDescription("Message ID to fork from").setRequired(true),
      ),
  )

export async function handleSessionCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const subcommand = interaction.options.getSubcommand()
  const userId = interaction.user.id
  const channel = interaction.channel

  if (!channel || !channel.isTextBased() || channel.isVoiceBased()) {
    await interaction.reply({
      embeds: [createErrorEmbed("This command can only be used in text channels")],
      ephemeral: true,
    })
    return
  }

  const sessionKey = channel.isDMBased()
    ? getDMSessionKey(userId)
    : getSessionKey(channel as TextChannel | ThreadChannel, userId)

  await interaction.deferReply()

  try {
    switch (subcommand) {
      case "create": {
        const title = interaction.options.getString("title")
        const session = await getOrCreateSession({
          author: interaction.user,
          channel,
          content: "",
          attachments: new Map(),
        } as any)

        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to create session")],
          })
          return
        }

        if (title) {
          await session.client.session.update({
            sessionID: session.sessionId,
            title,
          })
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Created", `Session ID: ${session.sessionId}`)],
        })
        break
      }

      case "list": {
        // Query all sessions from opencode database
        let tempServer: { client: any; server: { close: () => void } } | null = null
        
        try {
          tempServer = await createOpencodeServer({ port: 0, timeout: 10000 })
          const result = await tempServer.client.session.list({
            roots: true,
            limit: 50,
          })

          if (result.error || !result.data || result.data.length === 0) {
            await interaction.editReply({
              embeds: [createInfoEmbed("No Sessions", "No sessions found. Create one with `/session create`")],
            })
            return
          }

          const sessions = result.data
          const sessionList = sessions
            .map((s: any) => {
              const timestamp = Math.floor(s.time.updated / 1000)
              const title = s.title.length > 40 ? s.title.substring(0, 40) + "..." : s.title
              return `• \`${s.id}\`\n  ${title}\n  Updated: <t:${timestamp}:R>`
            })
            .join("\n\n")
          
          const embed = createInfoEmbed(
            `All Sessions (${sessions.length})`,
            sessionList.substring(0, 4000) + "\n\nUse `/session attach <id>` to continue a session."
          )
          
          await interaction.editReply({ embeds: [embed] })
        } catch (error) {
          console.error("Failed to list sessions:", error)
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to list sessions. Is opencode installed and in PATH?")],
          })
        } finally {
          tempServer?.server.close()
        }
        break
      }

      case "attach": {
        const sessionId = interaction.options.getString("id", true)
        const session = await getOrCreateSession(
          {
            author: interaction.user,
            channel,
            content: "",
            attachments: new Map(),
          } as any,
          sessionId,
        )

        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to attach to session")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Attached", `Attached to session: ${sessionId}`)],
        })
        break
      }

      case "share": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        const result = await session.client.session.share({
          sessionID: session.sessionId,
        })

        if (result.error || !result.data?.share?.url) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to share session")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Shared", result.data.share.url)],
        })
        break
      }

      case "unshare": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        const result = await session.client.session.unshare({
          sessionID: session.sessionId,
        })

        if (result.error) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to unshare session")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Unshared")],
        })
        break
      }

      case "rename": {
        const name = interaction.options.getString("name", true)
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        const result = await session.client.session.update({
          sessionID: session.sessionId,
          title: name,
        })

        if (result.error) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to rename session")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Renamed", `New name: ${name}`)],
        })
        break
      }

      case "compact": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createInfoEmbed("Compacting...", "Summarizing session...")],
        })

        const result = await session.client.session.summarize({
          sessionID: session.sessionId,
        })

        if (result.error) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to compact session")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Compacted")],
        })
        break
      }

      case "undo": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        const result = await session.client.session.revert({
          sessionID: session.sessionId,
        })

        if (result.error) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to undo")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Undo Successful")],
        })
        break
      }

      case "redo": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        const result = await session.client.session.unrevert({
          sessionID: session.sessionId,
        })

        if (result.error) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to redo")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Redo Successful")],
        })
        break
      }

      case "export": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createInfoEmbed("Exporting...", "Generating Markdown export...")],
        })

        // Get session messages
        const messagesResult = await session.client.session.messages({
          sessionID: session.sessionId,
          limit: 100,
        })

        if (messagesResult.error || !messagesResult.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to export session")],
          })
          return
        }

        // Format as markdown
        let markdown = `# Session Export\n\n`
        markdown += `**Session ID:** ${session.sessionId}\n\n`
        markdown += `---\n\n`

        for (const msg of messagesResult.data) {
          markdown += `## ${msg.info.role === "user" ? "User" : "Assistant"}\n\n`
          for (const part of msg.parts) {
            if (part.type === "text") {
              markdown += `${part.text}\n\n`
            }
          }
          markdown += `---\n\n`
        }

        // Send as file attachment
        const buffer = Buffer.from(markdown, "utf-8")
        await interaction.editReply({
          content: "📄 Session exported:",
          files: [
            {
              attachment: buffer,
              name: `session-${session.sessionId}.md`,
            },
          ],
        })
        break
      }

      case "copy": {
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createInfoEmbed("Copying...", "Retrieving transcript...")],
        })

        // Get session messages
        const messagesResult = await session.client.session.messages({
          sessionID: session.sessionId,
          limit: 100,
        })

        if (messagesResult.error || !messagesResult.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to copy session")],
          })
          return
        }

        // Format transcript
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

        // Send as file if too long
        if (transcript.length > 1900) {
          const buffer = Buffer.from(transcript, "utf-8")
          await interaction.editReply({
            content: "📄 Session transcript:",
            files: [
              {
                attachment: buffer,
                name: `transcript-${session.sessionId}.txt`,
              },
            ],
          })
        } else {
          await interaction.editReply({
            content: `\`\`\`\n${transcript}\n\`\`\``,
          })
        }
        break
      }

      case "fork": {
        const messageId = interaction.options.getString("message_id", true)
        const session = await getSessionByKey(sessionKey)
        if (!session) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No active session in this channel")],
          })
          return
        }

        const result = await session.client.session.fork({
          sessionID: session.sessionId,
          messageID: messageId,
        })

        if (result.error || !result.data) {
          await interaction.editReply({
            embeds: [createErrorEmbed("Failed to fork session")],
          })
          return
        }

        await interaction.editReply({
          embeds: [createSuccessEmbed("Session Forked", `New session ID: ${result.data.id}`)],
        })
        break
      }

      default:
        await interaction.editReply({
          embeds: [createErrorEmbed("Unknown subcommand")],
        })
    }
  } catch (error) {
    console.error("Session command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed("An error occurred while processing the command")],
    })
  }
}
