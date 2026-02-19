import { ResolvedDiscordAccount, DiscordConfig, DmPolicy } from "../types/index.js"

export function resolveDmPolicy(account: ResolvedDiscordAccount, cfg: DiscordConfig): DmPolicy {
  const dm = account.config.dm

  return {
    policy: dm?.policy ?? "pairing",
    allowFrom: dm?.allowFrom ?? [],
    allowFromPath: `channels.discord.${account.accountId === "default" ? "" : `accounts.${account.accountId}.`}dm.allowFrom`,
    approveHint: `Use "opencode pairing approve discord <code>" to approve`,
    normalizeEntry: (raw: string) => {
      return raw.replace(/^(discord|user):/i, "").replace(/^<@!?(\d+)>$/, "$1")
    },
  }
}

export interface DmCheckResult {
  allowed: boolean
  reason?: string
  pairingCode?: string
}

export function isDmAllowed(userId: string, policy: DmPolicy, pairedUsers: Set<string>): DmCheckResult {
  if (policy.policy === "disabled") {
    return { allowed: false, reason: "DMs are disabled" }
  }

  if (policy.policy === "open") {
    return { allowed: true }
  }

  const normalizedId = policy.normalizeEntry(userId)

  if (policy.policy === "allowlist") {
    const allowed = policy.allowFrom.some((entry) => policy.normalizeEntry(entry) === normalizedId)
    return allowed ? { allowed: true } : { allowed: false, reason: "User not in allowlist" }
  }

  // Pairing mode
  if (policy.allowFrom.includes(normalizedId) || pairedUsers.has(normalizedId)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `User not paired. ${policy.approveHint}`,
  }
}

export function collectSecurityWarnings(account: ResolvedDiscordAccount, cfg: DiscordConfig): string[] {
  const warnings: string[] = []
  const groupPolicy = account.config.groupPolicy ?? "allowlist"
  const guildsConfigured = Object.keys(account.config.guilds ?? {}).length > 0

  if (groupPolicy === "open" && !guildsConfigured) {
    warnings.push(
      `Discord guilds: groupPolicy="open" with no guild allowlist; any channel can trigger (mention-gated). Set channels.discord.groupPolicy="allowlist" and configure channels.discord.guilds.`,
    )
  }

  return warnings
}
