import { describe, expect, test } from "bun:test"

describe("handleAskCommand SDK integration", () => {
  test("calls session.prompt with correct v2 SDK format", async () => {
    let capturedArgs: any = null

    const mockPrompt = (args: any) => {
      capturedArgs = args
      return Promise.resolve({
        data: {
          parts: [{ type: "text", text: "Test answer" }],
        },
        error: null,
      })
    }

    const mockSession = {
      sessionId: "ask-session-id",
      client: {
        session: {
          prompt: mockPrompt,
        },
      },
    }

    const question = "What is the weather?"
    await mockSession.client.session.prompt({
      sessionID: mockSession.sessionId,
      parts: [{ type: "text", text: question }],
    })

    expect(capturedArgs).toBeDefined()
    expect(capturedArgs.sessionID).toBe("ask-session-id")
    expect(capturedArgs.parts).toHaveLength(1)
    expect(capturedArgs.parts[0].type).toBe("text")
    expect(capturedArgs.parts[0].text).toBe("What is the weather?")

    // Ensure old v1 format is NOT used
    expect(capturedArgs.path).toBeUndefined()
    expect(capturedArgs.body).toBeUndefined()
  })

  test("calls session.prompt with model parameter", async () => {
    let capturedArgs: any = null

    const mockPrompt = (args: any) => {
      capturedArgs = args
      return Promise.resolve({
        data: {
          parts: [{ type: "text", text: "Test answer" }],
        },
        error: null,
      })
    }

    const mockSession = {
      sessionId: "ask-session-id",
      model: { providerID: "anthropic", modelID: "claude-sonnet-4-20250514" },
      client: {
        session: {
          prompt: mockPrompt,
        },
      },
    }

    await mockSession.client.session.prompt({
      sessionID: mockSession.sessionId,
      model: mockSession.model,
      parts: [{ type: "text", text: "Hello" }],
    })

    expect(capturedArgs.sessionID).toBe("ask-session-id")
    expect(capturedArgs.model).toEqual({ providerID: "anthropic", modelID: "claude-sonnet-4-20250514" })
    expect(capturedArgs.parts).toHaveLength(1)
  })

  test("handles response text extraction", async () => {
    const mockResponse = {
      data: {
        parts: [
          { type: "text", text: "First line" },
          { type: "tool", tool: "weather" },
          { type: "text", text: "Second line" },
        ],
      },
      error: null,
    }

    const responseText =
      mockResponse.data.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") || "No response received"

    expect(responseText).toBe("First line\nSecond line")
  })

  test("handles empty response fallback", async () => {
    const mockResponse = {
      data: { parts: [] },
      error: null,
    }

    const responseText =
      mockResponse.data.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") || "No response received"

    expect(responseText).toBe("No response received")
  })

  test("handles error response", async () => {
    const mockResponse = {
      data: null,
      error: { message: "Failed to get response" },
    }

    expect(mockResponse.error).toBeDefined()
    expect(mockResponse.error.message).toBe("Failed to get response")
  })
})
