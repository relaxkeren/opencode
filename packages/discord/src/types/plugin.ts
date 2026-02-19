import type { z } from "zod"
import type { DiscordConfig } from "./config.js"
import type { ResolvedDiscordAccount } from "./account.js"

export interface ChannelMeta {
  name: string
  description: string
  icon?: string
}

export interface OnboardingAdapter {
  createAccountWizard?: () => Promise<{ success: boolean; accountId?: string }>
}

export interface PairingConfig {
  idLabel: string
  normalizeAllowEntry: (entry: string) => string
  notifyApproval: (params: { id: string }) => Promise<void>
}

export interface ChannelCapabilities {
  chatTypes: ("direct" | "channel" | "thread")[]
  polls: boolean
  reactions: boolean
  threads: boolean
  media: boolean
  nativeCommands: boolean
}

export interface StreamingConfig {
  blockStreamingCoalesceDefaults: {
    minChars: number
    idleMs: number
  }
}

export interface ReloadConfig {
  configPrefixes: string[]
}

export interface ChannelConfig<TAccount> {
  listAccountIds: () => string[]
  resolveAccount: (accountId: string) => TAccount
  defaultAccountId: () => string
  setAccountEnabled: (params: { accountId: string; enabled: boolean }) => void
  deleteAccount: (params: { accountId: string }) => void
  isConfigured: (account: TAccount) => boolean
  describeAccount: (account: TAccount) => AccountDescription
  resolveAllowFrom: (params: { account: TAccount }) => string[]
  formatAllowFrom: (params: { allowFrom: string[] }) => string[]
}

export interface AccountDescription {
  accountId: string
  name?: string
  enabled: boolean
  configured: boolean
  tokenSource: string
}

export interface DmPolicy {
  policy: "pairing" | "open" | "allowlist" | "disabled"
  allowFrom: string[]
  allowFromPath: string
  approveHint: string
  normalizeEntry: (raw: string) => string
}

export interface ChannelSecurity<TAccount> {
  resolveDmPolicy: (params: { cfg: DiscordConfig; accountId: string; account: TAccount }) => DmPolicy
  collectWarnings: (params: { account: TAccount; cfg: DiscordConfig }) => string[]
}

export interface ChannelMentions {
  stripPatterns: () => string[]
}

export interface ChannelThreading {
  resolveReplyToMode: (params: { cfg: DiscordConfig }) => "off" | "reply" | "quote"
}

export interface ChannelMessaging {
  normalizeTarget: (target: string) => string
  targetResolver: {
    looksLikeId: (id: string) => boolean
    hint: string
  }
}

export interface ChannelDirectory {
  self: () => Promise<null>
  listPeers: () => Promise<unknown[]>
  listGroups: () => Promise<unknown[]>
}

export interface ChannelResolver {
  resolveTargets: (params: {
    cfg: DiscordConfig
    accountId: string
    inputs: string[]
    kind: "user" | "group"
  }) => Promise<ResolvedTarget[]>
}

export interface ResolvedTarget {
  input: string
  resolved: boolean
  id?: string
  name?: string
  note?: string
}

export interface ChannelMessageActionAdapter {
  listActions: (ctx: unknown) => unknown[]
  extractToolSend: (ctx: unknown) => unknown | null
  handleAction: (ctx: unknown) => Promise<unknown>
}

export interface ChannelSetup {
  resolveAccountId: (params: { accountId: string }) => string
  applyAccountName: (params: { cfg: DiscordConfig; accountId: string; name?: string }) => DiscordConfig
  validateInput: (params: { accountId: string; input: unknown }) => string | null
  applyAccountConfig: (params: { cfg: DiscordConfig; accountId: string; input: unknown }) => DiscordConfig
}

export interface SendTextParams {
  to: string
  text: string
  accountId?: string
  deps?: { sendDiscord?: unknown }
  replyToId?: string
}

export interface SendMediaParams {
  to: string
  text?: string
  mediaUrl: string
  accountId?: string
  deps?: { sendDiscord?: unknown }
  replyToId?: string
}

export interface SendPollParams {
  to: string
  poll: unknown
  accountId?: string
}

export interface SendResult {
  channel: string
  messageId?: string
  ok: boolean
  error?: string
}

export interface ChannelOutbound {
  deliveryMode: "direct" | "queued"
  chunker: ChunkerConfig | null
  textChunkLimit: number
  pollMaxOptions: number
  sendText: (params: SendTextParams) => Promise<SendResult>
  sendMedia?: (params: SendMediaParams) => Promise<SendResult>
  sendPoll?: (params: SendPollParams) => Promise<SendResult>
}

export interface ChunkerConfig {
  maxLength: number
  separator?: string
}

export interface Logger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
  debug?: (message: string) => void
}

export interface GatewayContext<TAccount> {
  account: TAccount
  cfg: DiscordConfig
  runtime: unknown
  abortSignal: AbortSignal
  log?: Logger
  setStatus: (status: unknown) => void
}

export interface ChannelGateway<TAccount> {
  startAccount: (ctx: GatewayContext<TAccount>) => Promise<void>
  stopAccount?: (ctx: GatewayContext<TAccount>) => Promise<void>
}

export interface DefaultRuntimeState {
  accountId: string
  running: boolean
  lastStartAt: Date | null
  lastStopAt: Date | null
  lastError: string | null
}

export interface StatusIssue {
  level: "error" | "warning" | "info"
  message: string
}

export interface StatusParams<TAccount> {
  account: TAccount
  cfg: DiscordConfig
  runtime: unknown
}

export interface ChannelSummary {
  configured: boolean
  tokenSource: string
  running: boolean
  lastStartAt: Date | null
  lastStopAt: Date | null
  lastError: string | null
  probe?: unknown
  lastProbeAt?: Date | null
}

export interface SummaryParams {
  snapshot: AccountSnapshot
}

export interface ProbeParams<TAccount> {
  account: TAccount
  timeoutMs: number
}

export interface ProbeResult {
  ok: boolean
  bot?: {
    id: string
    username: string
    discriminator: string
  }
  application?: {
    id: string
    name: string
    description?: string
    intents?: {
      messageContent?: "enabled" | "disabled" | "limited"
    }
  }
  error?: string
  elapsedMs: number
}

export interface AuditParams<TAccount> {
  account: TAccount
  timeoutMs: number
  cfg: DiscordConfig
}

export interface AuditResult {
  ok: boolean
  checkedChannels: number
  unresolvedChannels: number
  channels: Array<{
    id: string
    name?: string
    permissions: string[]
  }>
  elapsedMs: number
}

export interface AccountSnapshot {
  accountId: string
  name?: string
  enabled: boolean
  configured: boolean
  tokenSource: string
  running: boolean
  lastStartAt: Date | null
  lastStopAt: Date | null
  lastError: string | null
  application?: unknown
  bot?: unknown
  probe?: unknown
  audit?: unknown
  lastInboundAt?: Date | null
  lastOutboundAt?: Date | null
}

export interface SnapshotParams<TAccount> {
  account: TAccount
  runtime: unknown
  probe?: ProbeResult
  audit?: AuditResult
}

export interface ChannelStatus<TAccount> {
  defaultRuntime: DefaultRuntimeState
  collectStatusIssues: (params: StatusParams<TAccount>) => StatusIssue[]
  buildChannelSummary: (params: SummaryParams) => ChannelSummary
  probeAccount: (params: ProbeParams<TAccount>) => Promise<ProbeResult>
  auditAccount?: (params: AuditParams<TAccount>) => Promise<AuditResult | undefined>
  buildAccountSnapshot: (params: SnapshotParams<TAccount>) => AccountSnapshot
}

export interface ChannelPlugin<TAccount> {
  id: string
  meta: ChannelMeta
  onboarding?: OnboardingAdapter
  pairing?: PairingConfig
  capabilities: ChannelCapabilities
  streaming?: StreamingConfig
  reload?: ReloadConfig
  configSchema: z.ZodSchema
  config: ChannelConfig<TAccount>
  security: ChannelSecurity<TAccount>
  groups?: unknown
  mentions?: ChannelMentions
  threading?: ChannelThreading
  messaging?: ChannelMessaging
  directory?: ChannelDirectory
  resolver?: ChannelResolver
  actions?: ChannelMessageActionAdapter
  setup?: ChannelSetup
  outbound: ChannelOutbound
  status: ChannelStatus<TAccount>
  gateway: ChannelGateway<TAccount>
}
