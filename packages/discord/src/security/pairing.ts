import { existsSync } from "fs"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname } from "path"

interface PairingRequest {
  code: string
  userId: string
  accountId: string
  createdAt: number
}

interface PairingData {
  codes: Record<string, PairingRequest>
  pairedUsers: string[]
}

const PAIRING_FILE = "discord-pairing.json"

export class PairingStore {
  private pairingPath: string
  private codes: Map<string, PairingRequest> = new Map()
  private pairedUsers: Set<string> = new Set()
  private loaded = false
  private deletedCodes: Set<string> = new Set() // Track codes deleted locally

  constructor(stateDir?: string) {
    const baseDir = stateDir || process.env.OPENCODE_STATE_DIR || `${process.env.HOME}/.opencode`
    this.pairingPath = `${baseDir}/${PAIRING_FILE}`
  }

  async load(): Promise<void> {
    if (!existsSync(this.pairingPath)) {
      this.codes.clear()
      this.pairedUsers.clear()
      this.deletedCodes.clear()
      this.loaded = true
      return
    }

    const content = await readFile(this.pairingPath, "utf-8")
    const data: PairingData = JSON.parse(content)

    this.codes = new Map(Object.entries(data.codes || {}))
    this.pairedUsers = new Set(data.pairedUsers || [])
    this.deletedCodes.clear() // Clear local deletions after loading fresh data
    this.loaded = true
  }

  async save(): Promise<void> {
    // Reload from disk first to merge with any concurrent changes
    const currentCodes = new Map(this.codes)
    const currentPaired = new Set(this.pairedUsers)
    const currentDeleted = new Set(this.deletedCodes)

    await this.load()

    // Merge: add new codes from disk that we haven't deleted
    for (const [code, request] of currentCodes) {
      this.codes.set(code, request)
    }

    // Remove codes that were deleted locally
    for (const code of currentDeleted) {
      this.codes.delete(code)
    }

    // Merge paired users
    for (const userId of currentPaired) {
      this.pairedUsers.add(userId)
    }

    const data: PairingData = {
      codes: Object.fromEntries(this.codes),
      pairedUsers: Array.from(this.pairedUsers),
    }

    // Ensure directory exists
    const dir = dirname(this.pairingPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(this.pairingPath, JSON.stringify(data, null, 2))
  }

  generateCode(userId: string, accountId: string): string {
    // Generate 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    this.codes.set(code, {
      code,
      userId,
      accountId,
      createdAt: Date.now(),
    })

    return code
  }

  approveCode(code: string): { success: boolean; userId?: string; error?: string } {
    const request = this.codes.get(code)
    if (!request) {
      return { success: false, error: "Invalid pairing code" }
    }

    // Check expiry (1 hour)
    if (Date.now() - request.createdAt > 60 * 60 * 1000) {
      this.codes.delete(code)
      this.deletedCodes.add(code)
      return { success: false, error: "Pairing code expired" }
    }

    this.pairedUsers.add(request.userId)
    this.codes.delete(code)
    this.deletedCodes.add(code) // Track that we deleted this code

    return { success: true, userId: request.userId }
  }

  isPaired(userId: string): boolean {
    return this.pairedUsers.has(userId)
  }

  removePairing(userId: string): void {
    this.pairedUsers.delete(userId)
  }

  listPairedUsers(): string[] {
    return Array.from(this.pairedUsers)
  }

  listPendingCodes(): PairingRequest[] {
    // Clean expired codes first
    const now = Date.now()
    for (const [code, request] of this.codes) {
      if (now - request.createdAt > 60 * 60 * 1000) {
        this.codes.delete(code)
      }
    }

    return Array.from(this.codes.values())
  }
}

// Global instance
let globalPairingStore: PairingStore | null = null

export function getPairingStore(): PairingStore {
  if (!globalPairingStore) {
    globalPairingStore = new PairingStore()
  }
  return globalPairingStore
}

export function setPairingStore(store: PairingStore): void {
  globalPairingStore = store
}
