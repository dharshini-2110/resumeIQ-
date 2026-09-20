// server/_core/llm.ts

export type Role =
  | "system"
  | "user"
  | "assistant"
  | "tool"
  | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent =
  | string
  | TextContent
  | ImageContent
  | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive =
  | "none"
  | "auto"
  | "required";

export type ToolChoiceByName = {
  name: string;
};

export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];

  tools?: Tool[];

  toolChoice?: ToolChoice;

  tool_choice?: ToolChoice;

  maxTokens?: number;

  max_tokens?: number;

  outputSchema?: OutputSchema;

  output_schema?: OutputSchema;

  responseFormat?: ResponseFormat;

  response_format?: ResponseFormat;

  model?: string;

  thinking?: Record<string, unknown>;

  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;

  type: "function";

  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;

  created: number;

  model: string;

  choices: Array<{
    index: number;

    message: {
      role: Role;

      content:
        | string
        | Array<
            TextContent |
            ImageContent |
            FileContent
          >;

      tool_calls?: ToolCall[];
    };

    finish_reason: string | null;
  }>;

  usage?: {
    prompt_tokens: number;

    completion_tokens: number;

    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;

  schema: Record<string, unknown>;

  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | {
      type: "text";
    }
  | {
      type: "json_object";
    }
  | {
      type: "json_schema";

      json_schema: JsonSchema;
    };

/*
|--------------------------------------------------------------------------
| Groq configuration
|--------------------------------------------------------------------------
*/

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

/*
 * IMPORTANT:
 *
 * We intentionally force this model here.
 *
 * This prevents any old router/code from sending:
 *
 * llama-3.3-70b-versatile
 *
 * to Groq.
 */
const GROQ_MODEL =
  "openai/gpt-oss-120b";

/*
|--------------------------------------------------------------------------
| Message normalization
|--------------------------------------------------------------------------
*/

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => {
  return Array.isArray(value)
    ? value
    : [value];
};

const normalizeContentPart = (
  part: MessageContent
):
  | TextContent
  | ImageContent
  | FileContent => {
  if (typeof part === "string") {
    return {
      type: "text",
      text: part,
    };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error(
    "Unsupported message content part"
  );
};

const normalizeMessage = (
  message: Message
) => {
  const {
    role,
    name,
    tool_call_id,
  } = message;

  /*
   * Tool/function messages must be converted
   * into plain string content.
   */
  if (
    role === "tool" ||
    role === "function"
  ) {
    const content = ensureArray(
      message.content
    )
      .map((part) =>
        typeof part === "string"
          ? part
          : JSON.stringify(part)
      )
      .join("\n");

    return {
      role,
      ...(name ? { name } : {}),
      ...(tool_call_id
        ? { tool_call_id }
        : {}),
      content,
    };
  }

  const contentParts =
    ensureArray(message.content).map(
      normalizeContentPart
    );

  /*
   * If there is only normal text,
   * send a simple string.
   */
  if (
    contentParts.length === 1 &&
    contentParts[0].type === "text"
  ) {
    return {
      role,
      ...(name ? { name } : {}),
      content:
        contentParts[0].text,
    };
  }

  /*
   * Otherwise preserve multimodal content.
   */
  return {
    role,
    ...(name ? { name } : {}),
    content: contentParts,
  };
};

/*
|--------------------------------------------------------------------------
| Tool choice normalization
|--------------------------------------------------------------------------
*/

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
):
  | "none"
  | "auto"
  | ToolChoiceExplicit
  | undefined => {
  if (!toolChoice) {
    return undefined;
  }

  if (
    toolChoice === "none" ||
    toolChoice === "auto"
  ) {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (
      !tools ||
      tools.length === 0
    ) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",

      function: {
        name:
          tools[0].function.name,
      },
    };
  }

  if (
    "name" in toolChoice
  ) {
    return {
      type: "function",

      function: {
        name: toolChoice.name,
      },
    };
  }

  return toolChoice;
};

/*
|--------------------------------------------------------------------------
| API key
|--------------------------------------------------------------------------
*/

const getGroqApiKey = () => {
  const apiKey =
    process.env.GROQ_API_KEY;

  if (
    !apiKey ||
    apiKey.trim().length === 0
  ) {
    throw new Error(
      "GROQ_API_KEY is not configured on the server"
    );
  }

  return apiKey.trim();
};

/*
|--------------------------------------------------------------------------
| Response format normalization
|--------------------------------------------------------------------------
*/

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;

  response_format?: ResponseFormat;

  outputSchema?: OutputSchema;

  output_schema?: OutputSchema;
}):
  | {
      type: "json_schema";

      json_schema: JsonSchema;
    }
  | {
      type: "text";
    }
  | {
      type: "json_object";
    }
  | undefined => {
  const explicitFormat =
    responseFormat ||
    response_format;

  if (explicitFormat) {
    if (
      explicitFormat.type ===
        "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }

    return explicitFormat;
  }

  const schema =
    outputSchema ||
    output_schema;

  if (!schema) {
    return undefined;
  }

  if (
    !schema.name ||
    !schema.schema
  ) {
    throw new Error(
      "outputSchema requires both name and schema"
    );
  }

  return {
    type: "json_schema",

    json_schema: {
      name: schema.name,

      schema: schema.schema,

      ...(typeof schema.strict ===
      "boolean"
        ? {
            strict:
              schema.strict,
          }
        : {}),
    },
  };
};

/*
|--------------------------------------------------------------------------
| Retry configuration
|--------------------------------------------------------------------------
*/

const RETRY_MAX_RETRIES = 3;

const RETRY_BASE_DELAY_MS = 1000;

const RETRY_MAX_DELAY_MS = 10000;

type FetchInit =
  NonNullable<
    Parameters<typeof fetch>[1]
  >;

const sleep = (
  ms: number
) =>
  new Promise<void>(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );

const parseRetryAfter = (
  value: string | null
): number | undefined => {
  if (!value) {
    return undefined;
  }

  const seconds =
    Number(value);

  if (
    Number.isFinite(seconds)
  ) {
    return Math.max(
      0,
      seconds * 1000
    );
  }

  const at = Date.parse(
    value
  );

  return Number.isNaN(at)
    ? undefined
    : Math.max(
        0,
        at - Date.now()
      );
};

const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(
    RETRY_BASE_DELAY_MS *
      2 ** attempt,
    RETRY_MAX_DELAY_MS
  );

  const jittered =
    cap / 2 +
    Math.random() *
      (cap / 2);

  return Math.min(
    Math.max(
      jittered,
      retryAfterMs ?? 0
    ),
    RETRY_MAX_DELAY_MS
  );
};

/*
|--------------------------------------------------------------------------
| Fetch with retry
|--------------------------------------------------------------------------
*/

const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <=
    RETRY_MAX_RETRIES;
    attempt++
  ) {
    try {
      const response =
        await fetch(
          url,
          init
        );

      /*
       * Success OR final attempt.
       */
      if (
        response.ok ||
        attempt ===
          RETRY_MAX_RETRIES
      ) {
        return response;
      }

      /*
       * IMPORTANT:
       *
       * Do NOT retry 400/401/403/404
       * because these are normally
       * configuration/request errors.
       *
       * Retry mainly transient errors.
       */
      if (
        response.status ===
          400 ||
        response.status ===
          401 ||
        response.status ===
          403 ||
        response.status ===
          404
      ) {
        return response;
      }

      const retryAfterMs =
        parseRetryAfter(
          response.headers.get(
            "retry-after"
          )
        );

      try {
        await response.body?.cancel();
      } catch {
        // Ignore body cancellation errors.
      }

      console.warn(
        `[LLM] Retry ${attempt + 1}/${RETRY_MAX_RETRIES} after HTTP ${response.status}`
      );

      await sleep(
        computeBackoffDelay(
          attempt,
          retryAfterMs
        )
      );
    } catch (error) {
      lastError = error;

      if (
        attempt ===
        RETRY_MAX_RETRIES
      ) {
        throw error;
      }

      console.warn(
        `[LLM] Retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );

      await sleep(
        computeBackoffDelay(
          attempt
        )
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "LLM request failed after exhausting retries"
      );
};

/*
|--------------------------------------------------------------------------
| Main LLM function
|--------------------------------------------------------------------------
*/

export async function invokeLLM(
  params: InvokeParams
): Promise<InvokeResult> {
  const apiKey =
    getGroqApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  /*
   * IMPORTANT:
   *
   * We DO NOT use params.model.
   *
   * This is intentional.
   *
   * Even if old code sends:
   *
   * llama-3.3-70b-versatile
   *
   * it will be ignored.
   *
   * Groq will always receive:
   *
   * openai/gpt-oss-120b
   */
  const payload: Record<
    string,
    unknown
  > = {
    model: GROQ_MODEL,

    messages:
      messages.map(
        normalizeMessage
      ),
  };

  /*
   * Tools
   */
  if (
    tools &&
    tools.length > 0
  ) {
    payload.tools = tools;
  }

  /*
   * Tool choice
   */
  const normalizedToolChoice =
    normalizeToolChoice(
      toolChoice ||
        tool_choice,
      tools
    );

  if (
    normalizedToolChoice
  ) {
    payload.tool_choice =
      normalizedToolChoice;
  }

  /*
   * Max tokens
   */
  const resolvedMaxTokens =
    max_tokens ??
    maxTokens;

  if (
    typeof resolvedMaxTokens ===
    "number"
  ) {
    payload.max_tokens =
      resolvedMaxTokens;
  }

  /*
   * Reasoning / thinking
   *
   * Keep these only when provided
   * by the caller.
   */
  if (thinking) {
    payload.thinking =
      thinking;
  }

  if (reasoning) {
    payload.reasoning =
      reasoning;
  }

  /*
   * Structured output
   */
  const normalizedResponseFormat =
    normalizeResponseFormat({
      responseFormat,
      response_format,
      outputSchema,
      output_schema,
    });

  if (
    normalizedResponseFormat
  ) {
    payload.response_format =
      normalizedResponseFormat;
  }

  /*
   * Debug logs
   *
   * These are intentionally useful
   * for Render debugging.
   */
  console.log(
    "[LLM] Sending request to Groq..."
  );

  console.log(
    "[LLM] Model:",
    GROQ_MODEL
  );

  console.log(
    "[LLM] Messages:",
    messages.length
  );

  console.log(
    "[LLM] Structured output:",
    Boolean(
      normalizedResponseFormat
    )
  );

  /*
   * Make request
   */
  const response =
    await fetchWithBackoff(
      GROQ_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify(
          payload
        ),
      }
    );

  /*
   * Handle API errors
   */
  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "[LLM] Groq API returned an error."
    );

    console.error(
      "[LLM] HTTP status:",
      response.status
    );

    console.error(
      "[LLM] Response:",
      errorText
    );

    throw new Error(
      `Groq API error (${response.status}): ${errorText}`
    );
  }

  /*
   * Parse response
   */
  const result =
    (await response.json()) as InvokeResult;

  /*
   * Validate response
   */
  if (
    !result ||
    !Array.isArray(
      result.choices
    ) ||
    result.choices.length === 0
  ) {
    console.error(
      "[LLM] Groq returned no choices."
    );

    console.error(
      "[LLM] Response:",
      JSON.stringify(result)
    );

    throw new Error(
      "Groq returned an invalid response with no choices"
    );
  }

  console.log(
    "[LLM] Groq request completed successfully."
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| Model listing
|--------------------------------------------------------------------------
*/

export type ModelInfo = {
  id: string;

  object: string;

  created: number;

  owned_by: string;
};

export type ModelsResponse = {
  object: string;

  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  const apiKey =
    getGroqApiKey();

  const url =
    "https://api.groq.com/openai/v1/models";

  const response =
    await fetchWithBackoff(
      url,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `List Groq models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}
