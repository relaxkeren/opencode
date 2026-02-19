#!/usr/bin/env bun
import { getPairingStore } from "../security/pairing.js"

const args = process.argv.slice(2)
const command = args[0]
const subcommand = args[1]

async function main() {
  const store = getPairingStore()
  await store.load()

  switch (command) {
    case "pairing":
      await handlePairingCommand(subcommand, args.slice(2))
      break
    default:
      console.log("Unknown command:", command)
      console.log("Usage: opencode-discord <command>")
      console.log("")
      console.log("Commands:")
      console.log("  pairing approve <code>     Approve a Discord pairing code")
      console.log("  pairing list               List paired Discord users")
      console.log("  pairing remove <userId>    Remove a paired Discord user")
      process.exit(1)
  }
}

async function handlePairingCommand(action: string, args: string[]) {
  const store = getPairingStore()

  switch (action) {
    case "approve": {
      const code = args[0]
      if (!code) {
        console.error("❌ Pairing code required")
        console.log("Usage: opencode-discord pairing approve <code>")
        process.exit(1)
      }

      const result = store.approveCode(code.toUpperCase())

      if (result.success) {
        await store.save()
        console.log(`✅ Approved pairing for user ${result.userId}`)
      } else {
        console.error(`❌ ${result.error}`)
        process.exit(1)
      }
      break
    }

    case "list": {
      const users = store.listPairedUsers()
      const pending = store.listPendingCodes()

      if (users.length === 0) {
        console.log("No paired users")
      } else {
        console.log("Paired users:")
        users.forEach((id) => console.log(`  - ${id}`))
      }

      if (pending.length > 0) {
        console.log("")
        console.log("Pending pairing codes:")
        pending.forEach((req) => {
          console.log(`  - ${req.code} (user: ${req.userId})`)
        })
      }
      break
    }

    case "remove": {
      const userId = args[0]
      if (!userId) {
        console.error("❌ User ID required")
        console.log("Usage: opencode-discord pairing remove <userId>")
        process.exit(1)
      }

      store.removePairing(userId)
      await store.save()
      console.log(`✅ Removed pairing for user ${userId}`)
      break
    }

    default:
      console.log("Unknown pairing command:", action)
      console.log("Usage: opencode-discord pairing <action>")
      console.log("")
      console.log("Actions:")
      console.log("  approve <code>     Approve a pairing code")
      console.log("  list               List paired users")
      console.log("  remove <userId>    Remove a paired user")
      process.exit(1)
  }
}

main().catch((error) => {
  console.error("❌ Error:", error)
  process.exit(1)
})
