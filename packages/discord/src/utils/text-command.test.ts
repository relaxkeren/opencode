import { describe, expect, test } from "bun:test"
import { parseTextCommand } from "./text-command.js"

describe("parseTextCommand", () => {
  test("parses /model current correctly", () => {
    const result = parseTextCommand("/model current")
    expect(result).toEqual({
      command: "model",
      subcommand: "current",
      args: [],
    })
  })

  test("parses /model list correctly", () => {
    const result = parseTextCommand("/model list")
    expect(result).toEqual({
      command: "model",
      subcommand: "list",
      args: [],
    })
  })

  test("parses /model switch correctly", () => {
    const result = parseTextCommand("/model switch openai gpt-4")
    expect(result).toEqual({
      command: "model",
      subcommand: "switch",
      args: ["openai", "gpt-4"],
    })
  })

  test("returns null for non-command content", () => {
    const result = parseTextCommand("hello world")
    expect(result).toBeNull()
  })

  test("returns null for invalid command", () => {
    const result = parseTextCommand("/invalid command")
    expect(result).toBeNull()
  })

  test("handles /model list --all correctly", () => {
    const result = parseTextCommand("/model list --all")
    expect(result).toEqual({
      command: "model",
      subcommand: "list",
      args: ["--all"],
    })
  })

  test("handles uppercase commands case-insensitively", () => {
    const result = parseTextCommand("/MODEL CURRENT")
    expect(result).toEqual({
      command: "model",
      subcommand: "current",
      args: [],
    })
  })

  test("handles extra whitespace", () => {
    const result = parseTextCommand("/model  current  ")
    expect(result).toEqual({
      command: "model",
      subcommand: "current",
      args: [],
    })
  })
})
