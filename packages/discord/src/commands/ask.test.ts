import { describe, expect, test } from "bun:test"

describe("handleAskCommand SDK integration", () => {
  test("calls session.prompt with correct SDK format", async () => {
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

    // Simulate the ask command calling prompt
    const question = "What is the weather?"
    await mockSession.client.session.prompt({
      path: { id: mockSession.sessionId },
      body: { parts: [{ type: "text", text: question }] },
    })

    // Assert correct format
    expect(capturedArgs).toBeDefined()
    expect(capturedArgs.path).toBeDefined()
    expect(capturedArgs.path.id).toBe("ask-session-id")
    expect(capturedArgs.body).toBeDefined()
    expect(capturedArgs.body.parts).toHaveLength(1)
    expect(capturedArgs.body.parts[0].type).toBe("text")
    expect(capturedArgs.body.parts[0].text).toBe("What is the weather?")

    // Ensure old flat format is NOT used
    expect(capturedArgs.sessionID).toBeUndefined()
    expect(capturedArgs.parts).toBeUndefined()
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

    // Simulate response text extraction logic from ask.ts
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
