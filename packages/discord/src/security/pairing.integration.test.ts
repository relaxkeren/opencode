import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { existsSync } from "fs"
import { unlink, rmdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { PairingStore, setPairingStore } from "./pairing.js"

describe("Pairing Integration - Bot + CLI workflow", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = join(tmpdir(), `pairing-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await import("fs/promises").then((m) => m.mkdir(tempDir, { recursive: true }))
  })

  afterEach(async () => {
    // Clean up
    const pairingPath = join(tempDir, "discord-pairing.json")
    if (existsSync(pairingPath)) {
      await unlink(pairingPath)
    }
    if (existsSync(tempDir)) {
      await rmdir(tempDir)
    }
  })

  test("complete workflow: bot generates, CLI approves, bot recognizes", async () => {
    // Simulate the bot starting
    const botStore = new PairingStore(tempDir)
    setPairingStore(botStore)
    await botStore.load()

    const userId = "453176791754997760"

    // Step 1: Bot generates code when user DMs
    const code = botStore.generateCode(userId, "default")
    await botStore.save()

    expect(botStore.listPendingCodes()).toHaveLength(1)
    expect(botStore.isPaired(userId)).toBe(false)

    // Step 2: CLI approves the code
    const cliStore = new PairingStore(tempDir)
    await cliStore.load()

    expect(cliStore.listPendingCodes()).toHaveLength(1)

    const result = cliStore.approveCode(code)
    expect(result.success).toBe(true)
    expect(result.userId).toBe(userId)

    await cliStore.save()

    // Step 3: Bot reloads and recognizes user as paired
    await botStore.load()

    expect(botStore.isPaired(userId)).toBe(true)
    expect(botStore.listPendingCodes()).toHaveLength(0)

    // Step 4: User DMs again - bot should NOT ask for pairing
    const isPaired = botStore.isPaired(userId)
    expect(isPaired).toBe(true)
  })

  test("bot generates new code if user sends multiple DMs while pending", async () => {
    const botStore = new PairingStore(tempDir)
    setPairingStore(botStore)
    await botStore.load()

    const userId = "453176791754997760"

    // User DMs multiple times before approval
    const code1 = botStore.generateCode(userId, "default")
    await botStore.save()

    // Simulate reload (as if bot restarted or new DM)
    await botStore.load()
    const code2 = botStore.generateCode(userId, "default")
    await botStore.save()

    // Should have both codes
    const codes = botStore.listPendingCodes()
    expect(codes).toHaveLength(2)

    // CLI approves the second code
    const cliStore = new PairingStore(tempDir)
    await cliStore.load()
    cliStore.approveCode(code2)
    await cliStore.save()

    // Bot should recognize as paired
    await botStore.load()
    expect(botStore.isPaired(userId)).toBe(true)
  })

  test("concurrent access - bot and CLI don't lose data", async () => {
    const botStore = new PairingStore(tempDir)
    const cliStore = new PairingStore(tempDir)

    await botStore.load()
    await cliStore.load()

    const userId1 = "user1"
    const userId2 = "user2"

    // Bot generates code for user1
    const code1 = botStore.generateCode(userId1, "default")
    await botStore.save()

    // CLI generates code for user2
    const code2 = cliStore.generateCode(userId2, "default")
    await cliStore.save()

    // Both stores should see both codes
    await botStore.load()
    expect(botStore.listPendingCodes()).toHaveLength(2)

    // CLI approves user1
    cliStore.approveCode(code1)
    await cliStore.save()

    // Bot should see the approval
    await botStore.load()
    expect(botStore.isPaired(userId1)).toBe(true)
    expect(botStore.listPendingCodes()).toHaveLength(1) // Only user2 pending
  })
})
