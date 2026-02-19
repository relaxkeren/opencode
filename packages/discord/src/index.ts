import { Client, GatewayIntentBits, REST, Routes, Events, Partials } from "discord.js"
import { config } from "dotenv"
import { askCommand } from "./commands/ask.js"
import { sessionCommand } from "./commands/session.js"
import { agentCommand } from "./commands/agent.js"
import { modelCommand } from "./commands/model.js"
import { mcpCommand } from "./commands/mcp.js"
import { connectCommand } from "./commands/connect.js"
import { statusCommand } from "./commands/status.js"
import { helpCommand } from "./commands/help.js"
import { handleMessage } from "./handlers/message.js"
import { handleInteraction } from "./handlers/interaction.js"

// Load environment variables
config()

const token = process.env.DISCORD_BOT_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.env.DISCORD_GUILD_ID

if (!token) {
  console.error("❌ DISCORD_BOT_TOKEN is required")
  process.exit(1)
}

if (!clientId) {
  console.error("❌ DISCORD_CLIENT_ID is required")
  process.exit(1)
}

console.log("🔧 Bot configuration:")
console.log("- Bot token present:", !!token)
console.log("- Client ID:", clientId)
console.log("- Guild ID (dev):", guildId || "Not set (global commands)")

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
})

// Command definitions
const commands = [
  askCommand.toJSON(),
  sessionCommand.toJSON(),
  agentCommand.toJSON(),
  modelCommand.toJSON(),
  mcpCommand.toJSON(),
  connectCommand.toJSON(),
  statusCommand.toJSON(),
  helpCommand.toJSON(),
]

// Register slash commands
const rest = new REST({ version: "10" }).setToken(token)

async function registerCommands() {
  try {
    console.log("🔄 Registering slash commands...")

    if (guildId) {
      // Guild-specific commands (faster update for development)
      await rest.put(Routes.applicationGuildCommands(clientId!, guildId), {
        body: commands,
      })
      console.log(`✅ Registered ${commands.length} commands to guild ${guildId}`)
    } else {
      // Global commands (takes up to an hour to propagate)
      await rest.put(Routes.applicationCommands(clientId!), {
        body: commands,
      })
      console.log(`✅ Registered ${commands.length} global commands`)
    }
  } catch (error) {
    console.error("❌ Failed to register commands:", error)
  }
}

// Event handlers
client.on(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`)
  console.log("✅ Bot is ready!")
})

client.on(Events.MessageCreate, handleMessage)

client.on(Events.InteractionCreate, handleInteraction)

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error)
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down...")
  client.destroy()
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down...")
  client.destroy()
  process.exit(0)
})

// Start bot
async function main() {
  await registerCommands()
  await client.login(token)
}

main().catch((error) => {
  console.error("❌ Failed to start bot:", error)
  process.exit(1)
})
