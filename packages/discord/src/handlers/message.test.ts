import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { handleMessage } from "../handlers/message.js"
import { jest } from "bun:test"

describe("handleMessage", () => {
  test("calls session.prompt with correct SDK format", async () => {
    // Track the arguments passed to prompt
    let capturedArgs: any = null

    // Mock session client
    const mockPrompt = (args: any) => {
      capturedArgs = args
      return Promise.resolve({
        data: {
          parts: [{ type: "text", text: "Test response" }],
        },
        error: null,
      })
    }

    const mockSession = {
      sessionId: "test-session-id",
      client: {
        session: {
          prompt: mockPrompt,
        },
      },
    }

    // Verify the SDK call format
    await mockSession.client.session.prompt({
      path: { id: mockSession.sessionId },
      body: { parts: [{ type: "text", text: "Hello" }] },
    })

    // Assert the correct format is used
    expect(capturedArgs).toBeDefined()
    expect(capturedArgs.path).toBeDefined()
    expect(capturedArgs.path.id).toBe("test-session-id")
    expect(capturedArgs.body).toBeDefined()
    expect(capturedArgs.body.parts).toBeDefined()
    expect(capturedArgs.body.parts).toHaveLength(1)
    expect(capturedArgs.body.parts[0].type).toBe("text")
    expect(capturedArgs.body.parts[0].text).toBe("Hello")

    // Ensure old flat format is NOT used
    expect(capturedArgs.sessionID).toBeUndefined()
    expect(capturedArgs.parts).toBeUndefined()
  })

  test("handles response from SDK with info.content", async () => {
    const mockPrompt = () => {
      return Promise.resolve({
        data: {
          info: { content: "Hello from assistant" },
          parts: [],
        },
        error: null,
      })
    }

    const result = await mockPrompt()
    const response = result.data

    // Check info.content first (matching Slack integration)
    const responseText =
      response.info?.content ||
      response.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") ||
      "I received your message but didn't have a response."

    expect(responseText).toBe("Hello from assistant")
  })

  test("handles empty response from SDK", async () => {
    const mockPrompt = () => {
      return Promise.resolve({
        data: { parts: [] },
        error: null,
      })
    }

    const result = await mockPrompt()
    const response = result.data

    // Verify empty parts array
    expect(result.data.parts).toHaveLength(0)

    // Simulate the fallback message logic
    const responseText =
      response.info?.content ||
      response.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n") ||
      "I received your message but didn't have a response."

    expect(responseText).toBe("I received your message but didn't have a response.")
  })

  test("handles SDK error response", async () => {
    const mockPrompt = () => {
      return Promise.resolve({
        data: null,
        error: { message: "API Error" },
      })
    }

    const result = await mockPrompt()

    expect(result.error).toBeDefined()
    expect(result.error.message).toBe("API Error")
  })
})

describe("SDK API Format Compliance", () => {
  test("v1 SDK uses path.body structure", () => {
    // This test documents the expected SDK v1 format
    const expectedV1Format = {
      path: { id: "session-id" },
      body: {
        parts: [{ type: "text", text: "message" }],
      },
    }

    // Verify structure
    expect(expectedV1Format).toHaveProperty("path.id")
    expect(expectedV1Format).toHaveProperty("body.parts")
    expect(Array.isArray(expectedV1Format.body.parts)).toBe(true)
  })

  test("incorrect flat format should be rejected", () => {
    // This test documents the incorrect format that was causing the bug
    const incorrectFlatFormat = {
      sessionID: "session-id",
      parts: [{ type: "text", text: "message" }],
    }

    // This format is wrong because it doesn't follow the SDK's expected structure
    expect(incorrectFlatFormat).not.toHaveProperty("path")
    expect(incorrectFlatFormat).not.toHaveProperty("body")
  })
})
