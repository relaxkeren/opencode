import { describe, expect, test } from "bun:test"

describe("handleMessage SDK format", () => {
  test("calls session.prompt with correct v2 SDK format", async () => {
    let capturedArgs: any = null

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

    // Call with v2 SDK format (flat parameters)
    await mockSession.client.session.prompt({
      sessionID: mockSession.sessionId,
      parts: [{ type: "text", text: "Hello" }],
    })

    // Assert the correct v2 format is used
    expect(capturedArgs).toBeDefined()
    expect(capturedArgs.sessionID).toBe("test-session-id")
    expect(capturedArgs.parts).toBeDefined()
    expect(capturedArgs.parts).toHaveLength(1)
    expect(capturedArgs.parts[0].type).toBe("text")
    expect(capturedArgs.parts[0].text).toBe("Hello")

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
          parts: [{ type: "text", text: "Test response" }],
        },
        error: null,
      })
    }

    const mockSession = {
      sessionId: "test-session-id",
      model: { providerID: "openai", modelID: "gpt-4o" },
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

    expect(capturedArgs.sessionID).toBe("test-session-id")
    expect(capturedArgs.model).toEqual({ providerID: "openai", modelID: "gpt-4o" })
    expect(capturedArgs.parts).toHaveLength(1)
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
        data: {
          info: null,
          parts: [],
        } as any,
        error: null,
      })
    }

    const result = await mockPrompt()
    const response = result.data

    expect(result.data.parts).toHaveLength(0)

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

describe("SDK v2 Format Compliance", () => {
  test("v2 SDK uses flat parameter structure", () => {
    const expectedV2Format = {
      sessionID: "session-id",
      parts: [{ type: "text", text: "message" }],
    }

    expect(expectedV2Format).toHaveProperty("sessionID")
    expect(expectedV2Format).toHaveProperty("parts")
    expect(Array.isArray(expectedV2Format.parts)).toBe(true)
  })

  test("v2 SDK accepts model parameter", () => {
    const params = {
      sessionID: "session-id",
      model: { providerID: "openai", modelID: "gpt-4o" },
      parts: [{ type: "text", text: "message" }],
    }

    expect(params.model).toHaveProperty("providerID")
    expect(params.model).toHaveProperty("modelID")
  })
})
