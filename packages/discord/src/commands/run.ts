import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from "discord.js"
import { spawn } from "child_process"
import { createInfoEmbed, createErrorEmbed, createSuccessEmbed } from "../utils/discord.js"
import { platform } from "os"
import { access } from "fs/promises"
import { constants } from "fs"
import { join } from "path"

export const runCommand = new SlashCommandBuilder()
  .setName("run")
  .setDescription("Execute an executable from PATH")
  .addStringOption((option) =>
    option
      .setName("exe")
      .setDescription("Executable name (without .exe extension)")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option.setName("args").setDescription("Arguments to pass to the executable (optional)").setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName("timeout")
      .setDescription("Timeout in seconds (default: 30, max: 300)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(300),
  )

/**
 * Find an executable in the system PATH
 */
async function findExecutable(exeName: string): Promise<string | null> {
  const isWindows = platform() === "win32"
  const extensions = isWindows ? [".exe", ".cmd", ".bat", ".ps1", ""] : [""]
  const pathEnv = process.env.PATH || ""
  const pathDirs = pathEnv.split(isWindows ? ";" : ":")

  // Also check common directories
  const commonDirs = isWindows
    ? ["C:\\Windows\\System32", "C:\\Windows", "C:\\Windows\\SysWOW64"]
    : ["/usr/bin", "/bin", "/usr/local/bin", "/sbin", "/usr/sbin"]

  const searchDirs = [...pathDirs, ...commonDirs]

  for (const dir of searchDirs) {
    if (!dir) continue

    for (const ext of extensions) {
      const fullPath = join(dir, exeName + ext)
      try {
        await access(fullPath, constants.X_OK)
        return fullPath
      } catch {
        // Not found or not executable, continue
      }
    }
  }

  return null
}

/**
 * Execute a command with timeout and return output
 */
function executeCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL")
        }
      }, 5000)
    }, timeoutMs)

    child.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    child.on("close", (code) => {
      clearTimeout(timeout)
      resolve({
        stdout: stdout.slice(0, 8000), // Limit output size
        stderr: stderr.slice(0, 4000),
        exitCode: code ?? 0,
        timedOut,
      })
    })

    child.on("error", (err) => {
      clearTimeout(timeout)
      resolve({
        stdout: "",
        stderr: err.message,
        exitCode: -1,
        timedOut: false,
      })
    })
  })
}

export async function handleRunCommand(interaction: ChatInputCommandInteraction<CacheType>) {
  const exeName = interaction.options.getString("exe", true).trim()
  const argsStr = interaction.options.getString("args") || ""
  const timeoutSec = interaction.options.getInteger("timeout") || 30
  const timeoutMs = timeoutSec * 1000

  // Security: block dangerous executables
  const blockedCommands = [
    "cmd",
    "powershell",
    "pwsh",
    "bash",
    "sh",
    "zsh",
    "python",
    "python3",
    "node",
    "npm",
    "npx",
    "ruby",
    "perl",
    "php",
    "java",
    "javac",
    "gcc",
    "g++",
    "clang",
    "make",
    "cmake",
    "docker",
    "kubectl",
    "ssh",
    "scp",
    "ftp",
    "telnet",
    "netcat",
    "nc",
    "wget",
    "curl",
    "rm",
    "del",
    "rmdir",
    "format",
    "fdisk",
    "diskpart",
    "reg",
    "regedit",
  ]

  const lowerExeName = exeName.toLowerCase()
  if (blockedCommands.includes(lowerExeName)) {
    await interaction.reply({
      embeds: [createErrorEmbed(`⚠️ "${exeName}" is blocked for security reasons.`)],
      ephemeral: true,
    })
    return
  }

  // Validate exe name (no path separators, no special chars)
  if (/[\/\\<>:"|?*]/.test(exeName)) {
    await interaction.reply({
      embeds: [createErrorEmbed("❌ Invalid executable name. Do not include paths or special characters.")],
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  try {
    // Find the executable
    const exePath = await findExecutable(exeName)

    if (!exePath) {
      await interaction.editReply({
        embeds: [createErrorEmbed(`❌ Executable "${exeName}" not found in PATH.`)],
      })
      return
    }

    // Parse arguments (simple space splitting, respecting quotes)
    const args: string[] = []
    const argRegex = /"([^"]*)"|'([^']*)'|\S+/g
    let match
    while ((match = argRegex.exec(argsStr)) !== null) {
      args.push(match[1] || match[2] || match[0])
    }

    // Execute the command
    const result = await executeCommand(exePath, args, timeoutMs)

    // Build response
    const { EmbedBuilder } = await import("discord.js")
    const embed = new EmbedBuilder()
      .setColor(result.exitCode === 0 ? 0x00ff00 : 0xff6600)
      .setTitle(`${result.exitCode === 0 ? "✅" : "⚠️"} ${exeName}`)
      .setDescription(`\`\`\`\n${exePath}\n\`\`\``)
      .addFields(
        { name: "Exit Code", value: String(result.exitCode), inline: true },
        { name: "Timeout", value: `${timeoutSec}s`, inline: true },
        { name: "Timed Out", value: result.timedOut ? "Yes" : "No", inline: true },
      )

    // Add stdout if present
    if (result.stdout) {
      const stdoutDisplay = result.stdout.length > 1000 ? result.stdout.slice(0, 997) + "..." : result.stdout
      embed.addFields({ name: "📤 Output", value: `\`\`\`\n${stdoutDisplay}\n\`\`\`` })
    }

    // Add stderr if present
    if (result.stderr) {
      const stderrDisplay = result.stderr.length > 500 ? result.stderr.slice(0, 497) + "..." : result.stderr
      embed.addFields({ name: "📥 Errors", value: `\`\`\`\n${stderrDisplay}\n\`\`\`` })
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    console.error("Run command error:", error)
    await interaction.editReply({
      embeds: [createErrorEmbed(`❌ Failed to execute: ${error instanceof Error ? error.message : String(error)}`)],
    })
  }
}
