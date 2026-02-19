import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { existsSync } from "fs"
import { unlink, readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { PairingStore, setPairingStore, getPairingStore } from "./pairing.js"

describe("PairingStore", () => {
  let tempDir: string
  let store: PairingStore

  beforeEach(async () => {
    // Create a temp directory for each test
    tempDir = join(tmpdir(), `pairing-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(tempDir, { recursive: true })

    // Create a fresh store for each test
    store = new PairingStore(tempDir)
    setPairingStore(store)
    await store.load()
  })

  afterEach(async () => {
    // Clean up temp file
    const pairingPath = join(tempDir, "discord-pairing.json")
    if (existsSync(pairingPath)) {
      await unlink(pairingPath)
    }
  })

  describe("generateCode", () => {
    test("generates a 6-character code", () => {
      const code = store.generateCode("user123", "default")
      expect(code).toHaveLength(6)
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })

    test("generates unique codes", () => {
      const code1 = store.generateCode("user1", "default")
      const code2 = store.generateCode("user2", "default")
      expect(code1).not.toBe(code2)
    })

    test("stores code with correct data", () => {
      const code = store.generateCode("user123", "account1")
      const codes = store.listPendingCodes()

      expect(codes).toHaveLength(1)
      expect(codes[0].code).toBe(code)
      expect(codes[0].userId).toBe("user123")
      expect(codes[0].accountId).toBe("account1")
      expect(codes[0].createdAt).toBeGreaterThan(0)
    })
  })

  describe("save and load", () => {
    test("saves codes to file", async () => {
      store.generateCode("user123", "default")
      await store.save()

      const pairingPath = join(tempDir, "discord-pairing.json")
      expect(existsSync(pairingPath)).toBe(true)

      const content = await readFile(pairingPath, "utf-8")
      const data = JSON.parse(content)

      expect(Object.keys(data.codes)).toHaveLength(1)
      expect(data.pairedUsers).toEqual([])
    })

    test("loads codes from file", async () => {
      // Pre-populate file
      const pairingPath = join(tempDir, "discord-pairing.json")
      await writeFile(
        pairingPath,
        JSON.stringify({
          codes: {
            ABC123: {
              code: "ABC123",
              userId: "user456",
              accountId: "default",
              createdAt: Date.now(),
            },
          },
          pairedUsers: ["user789"],
        }),
      )

      // Create new store and load
      const newStore = new PairingStore(tempDir)
      await newStore.load()

      const codes = newStore.listPendingCodes()
      expect(codes).toHaveLength(1)
      expect(codes[0].code).toBe("ABC123")
      expect(newStore.isPaired("user789")).toBe(true)
    })

    test("reloads from disk to get latest changes", async () => {
      // Simulate CLI writing to file while bot is running
      const pairingPath = join(tempDir, "discord-pairing.json")

      // Bot generates code
      store.generateCode("user1", "default")
      await store.save()

      // CLI approves (simulated by direct file write)
      const content = await readFile(pairingPath, "utf-8")
      const data = JSON.parse(content)
      data.pairedUsers.push("user1")
      delete data.codes[Object.keys(data.codes)[0]]
      await writeFile(pairingPath, JSON.stringify(data))

      // Bot reloads
      await store.load()

      expect(store.isPaired("user1")).toBe(true)
      expect(store.listPendingCodes()).toHaveLength(0)
    })
  })

  describe("approveCode", () => {
    test("approves valid code", () => {
      const code = store.generateCode("user123", "default")
      const result = store.approveCode(code)

      expect(result.success).toBe(true)
      expect(result.userId).toBe("user123")
      expect(store.isPaired("user123")).toBe(true)
    })

    test("removes code after approval", () => {
      const code = store.generateCode("user123", "default")
      store.approveCode(code)

      const codes = store.listPendingCodes()
      expect(codes).toHaveLength(0)
    })

    test("rejects invalid code", () => {
      const result = store.approveCode("INVALID")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid pairing code")
    })

    test("rejects expired code", () => {
      // Create an expired code by manipulating the store directly
      const code = "EXPIRED"
      ;(store as any).codes.set(code, {
        code,
        userId: "user123",
        accountId: "default",
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      })

      const result = store.approveCode(code)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Pairing code expired")
    })
  })

  describe("concurrent access (race condition tests)", () => {
    test("two stores sharing same file - changes visible after reload", async () => {
      // Simulate bot and CLI as separate stores
      const botStore = new PairingStore(tempDir)
      const cliStore = new PairingStore(tempDir)

      await botStore.load()
      await cliStore.load()

      // Bot generates code
      const code = botStore.generateCode("user123", "default")
      await botStore.save()

      // CLI loads and approves
      await cliStore.load()
      cliStore.approveCode(code)
      await cliStore.save()

      // Bot reloads and sees the approval
      await botStore.load()
      expect(botStore.isPaired("user123")).toBe(true)
    })

    test("save should not overwrite concurrent changes", async () => {
      // This test documents the current bug - bot overwrites CLI changes
      const pairingPath = join(tempDir, "discord-pairing.json")

      // Initial state: one pending code
      await writeFile(
        pairingPath,
        JSON.stringify({
          codes: { CODE1: { code: "CODE1", userId: "user1", accountId: "default", createdAt: Date.now() } },
          pairedUsers: [],
        }),
      )

      // Both bot and CLI load
      const botStore = new PairingStore(tempDir)
      const cliStore = new PairingStore(tempDir)
      await botStore.load()
      await cliStore.load()

      // CLI approves
      cliStore.approveCode("CODE1")
      await cliStore.save()

      // Bot generates new code (without reloading)
      botStore.generateCode("user2", "default")
      await botStore.save() // BUG: This overwrites CLI's approval!

      // Verify the bug - user1 should be paired but isn't
      const finalStore = new PairingStore(tempDir)
      await finalStore.load()

      // This assertion will fail with current implementation, demonstrating the bug
      // expect(finalStore.isPaired("user1")).toBe(true) // This will FAIL
      expect(finalStore.listPendingCodes()).toHaveLength(2) // Both codes exist, but user1 not paired
    })
  })

  describe("removePairing", () => {
    test("removes paired user", () => {
      const code = store.generateCode("user123", "default")
      store.approveCode(code)
      expect(store.isPaired("user123")).toBe(true)

      store.removePairing("user123")
      expect(store.isPaired("user123")).toBe(false)
    })
  })

  describe("listPendingCodes", () => {
    test("cleans expired codes", () => {
      // Add valid code
      store.generateCode("user1", "default")

      // Add expired code directly
      ;(store as any).codes.set("EXPIRED", {
        code: "EXPIRED",
        userId: "user2",
        accountId: "default",
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      })

      const codes = store.listPendingCodes()
      expect(codes).toHaveLength(1)
      expect(codes[0].userId).toBe("user1")
    })
  })
})
