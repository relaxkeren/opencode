import { REST } from "discord.js"
import { ProbeResult, StatusIssue } from "../types/index.js"

export async function probeDiscord(token: string, timeoutMs: number = 5000): Promise<ProbeResult> {
  const startTime = Date.now()

  try {
    const rest = new REST({ version: "10" }).setToken(token)

    const [botUser, appInfo] = await Promise.all([
      rest.get("/users/@me") as Promise<any>,
      rest.get("/oauth2/applications/@me") as Promise<any>,
    ])

    const elapsedMs = Date.now() - startTime

    // Check message content intent
    const flags = appInfo.flags || 0
    const messageContentIntent = flags & (1 << 15) ? "enabled" : "limited"

    return {
      ok: true,
      bot: {
        id: botUser.id,
        username: botUser.username,
        discriminator: botUser.discriminator || "0",
      },
      application: {
        id: appInfo.id,
        name: appInfo.name,
        description: appInfo.description,
        intents: {
          messageContent: messageContentIntent,
        },
      },
      elapsedMs,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startTime,
    }
  }
}

export function collectStatusIssues(params: { account: { token?: string; enabled: boolean } }): StatusIssue[] {
  const issues: StatusIssue[] = []
  const { account } = params

  if (!account.token?.trim()) {
    issues.push({ level: "error", message: "Discord token not configured" })
  }

  if (!account.enabled) {
    issues.push({ level: "warning", message: "Discord account is disabled" })
  }

  return issues
}
