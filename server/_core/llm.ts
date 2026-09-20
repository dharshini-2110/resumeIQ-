// server/_core/llm.ts

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMResponseFormat = {
  type: "json_schema" | "json_object" | "text";
  json_schema?: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
};

export type InvokeParams = {
  model?: string;
  messages: LLMMessage[];
  response_format?: LLMResponseFormat;
  temperature?: number;
  max_tokens?: number;
};

export type InvokeResult = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | Array<{
        type: "text";
        text: string;
      }>;
    };
    finish_reason?: string;
  }>;
};

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-120b";

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Call Groq's OpenAI-compatible Chat Completions API.
 *
 * This replaces the old Manus/Forge LLM integration.
 */
export async function invokeLLM(
  params: InvokeParams
): Promise<InvokeResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error(
      "[LLM] GROQ_API_KEY is missing from environment variables."
    );

    throw new Error(
      "GROQ_API_KEY is not configured on the server."
    );
  }

  const model = params.model || DEFAULT_MODEL;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: params.messages,
    };

    if (params.response_format) {
      body.response_format = params.response_format;
    }

    if (typeof params.temperature === "number") {
      body.temperature = params.temperature;
    }

    if (typeof params.max_tokens === "number") {
      body.max_tokens = params.max_tokens;
    }

    console.log("[LLM] Sending request to Groq...");
    console.log("[LLM] Model:", model);
    console.log(
      "[LLM] Messages:",
      params.messages.length
    );
    console.log(
      "[LLM] Structured output:",
      Boolean(params.response_format)
    );

    const response = await fetch(GROQ_API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify(body),

      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[LLM] Groq API returned an error."
      );

      console.error(
        "[LLM] HTTP status:",
        response.status
      );

      console.error(
        "[LLM] Response:",
        responseText
      );

      let errorMessage = responseText;

      try {
        const parsed = JSON.parse(responseText);

        if (
          parsed?.error?.message
        ) {
          errorMessage = parsed.error.message;
        }
      } catch {
        // Keep original response text.
      }

      throw new Error(
        `Groq API error (${response.status}): ${errorMessage}`
      );
    }

    let data: InvokeResult;

    try {
      data = JSON.parse(
        responseText
      ) as InvokeResult;
    } catch (error) {
      console.error(
        "[LLM] Groq returned invalid JSON."
      );

      console.error(
        "[LLM] Raw response:",
        responseText
      );

      throw new Error(
        "Groq returned an invalid JSON response."
      );
    }

    if (
      !data ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0
    ) {
      console.error(
        "[LLM] Groq response did not contain choices."
      );

      console.error(
        "[LLM] Response:",
        JSON.stringify(data)
      );

      throw new Error(
        "Groq returned no completion choices."
      );
    }

    const firstChoice = data.choices[0];

    if (!firstChoice?.message) {
      console.error(
        "[LLM] Groq response is missing message."
      );

      throw new Error(
        "Groq returned an invalid completion."
      );
    }

    console.log(
      "[LLM] Groq request completed successfully."
    );

    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      console.error(
        "[LLM] Groq request timed out."
      );

      throw new Error(
        "AI request timed out. Please try again."
      );
    }

    console.error(
      "[LLM] Request failed:",
      error
    );

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract text from a Groq completion.
 */
export function extractTextContent(
  response: InvokeResult
): string {
  const content =
    response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (item) => item.type === "text"
      )
      .map(
        (item) => item.text
      )
      .join("\n");
  }

  return "";
}
