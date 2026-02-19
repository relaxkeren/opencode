import { z } from "zod"

export const DiscordDmConfigSchema = z.object({
  policy: z.enum(["pairing", "open", "allowlist", "disabled"]).default("pairing"),
  allowFrom: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
})

export const DiscordChannelConfigSchema = z.object({
  allow: z.boolean().default(true),
  requireMention: z.boolean().default(true),
})

export const DiscordGuildConfigSchema = z.object({
  name: z.string().optional(),
  channels: z.record(DiscordChannelConfigSchema).default({}),
})

export const DiscordCommandsConfigSchema = z.object({
  native: z.union([z.boolean(), z.literal("auto")]).default("auto"),
})

export const DiscordAccountConfigSchema = z.object({
  enabled: z.boolean().default(true),
  name: z.string().optional(),
  token: z.string().optional(),
  dm: DiscordDmConfigSchema.optional(),
  guilds: z.record(DiscordGuildConfigSchema).default({}),
  groupPolicy: z.enum(["allowlist", "open"]).default("allowlist"),
  commands: DiscordCommandsConfigSchema.default({}),
  mediaMaxMb: z.number().default(8),
  historyLimit: z.number().default(100),
})

export const DiscordConfigSchema = z.object({
  enabled: z.boolean().default(true),
  token: z.string().optional(),
  accounts: z.record(DiscordAccountConfigSchema).optional(),
  dm: DiscordDmConfigSchema.optional(),
  guilds: z.record(DiscordGuildConfigSchema).default({}),
  groupPolicy: z.enum(["allowlist", "open"]).default("allowlist"),
  commands: DiscordCommandsConfigSchema.default({}),
  mediaMaxMb: z.number().default(8),
  historyLimit: z.number().default(100),
  replyToMode: z.enum(["off", "reply", "quote"]).default("off"),
})

export type DiscordConfig = z.infer<typeof DiscordConfigSchema>
export type DiscordAccountConfig = z.infer<typeof DiscordAccountConfigSchema>
export type DiscordDmConfig = z.infer<typeof DiscordDmConfigSchema>
export type DiscordGuildConfig = z.infer<typeof DiscordGuildConfigSchema>
export type DiscordChannelConfig = z.infer<typeof DiscordChannelConfigSchema>

export function buildChannelConfigSchema(baseSchema: z.ZodSchema) {
  return z.object({
    channels: z
      .object({
        discord: baseSchema,
      })
      .optional(),
  })
}
