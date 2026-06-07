import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  InternalServerError,
  OpenAI,
  RateLimitError,
} from "openai";

export const AI_ANALYSIS_USER_MESSAGES = {
  not_configured: "AI Analysis is not configured.",
  billing_unavailable: "AI Analysis billing/quota unavailable.",
  service_unavailable: "OpenAI service temporarily unavailable.",
} as const;

export type AiAnalysisErrorCode =
  | "not_configured"
  | "billing_unavailable"
  | "service_unavailable"
  | "invalid_request"
  | "empty_response"
  | "parse_error";

export class AiAnalysisError extends Error {
  readonly code: AiAnalysisErrorCode;
  readonly status: number;
  readonly userMessage: string;

  constructor(input: {
    code: AiAnalysisErrorCode;
    status: number;
    userMessage: string;
    cause?: unknown;
  }) {
    super(input.userMessage);
    this.name = "AiAnalysisError";
    this.code = input.code;
    this.status = input.status;
    this.userMessage = input.userMessage;
    if (input.cause instanceof Error) {
      this.cause = input.cause;
    }
  }
}

function isBillingOrQuotaError(error: APIError): boolean {
  const code = String(error.code ?? "").toLowerCase();
  const type = String(error.type ?? "").toLowerCase();
  const message = error.message.toLowerCase();

  if (error.status === 402) {
    return true;
  }

  if (error.status === 429) {
    return (
      code.includes("insufficient_quota") ||
      code.includes("billing") ||
      type.includes("insufficient_quota") ||
      message.includes("insufficient_quota") ||
      message.includes("billing") ||
      message.includes("quota") ||
      message.includes("exceeded your current quota")
    );
  }

  return (
    code.includes("insufficient_quota") ||
    code.includes("billing") ||
    message.includes("insufficient_quota") ||
    message.includes("exceeded your current quota")
  );
}

export function mapOpenAiError(error: unknown): AiAnalysisError {
  if (error instanceof AiAnalysisError) {
    return error;
  }

  if (error instanceof APIConnectionTimeoutError || error instanceof APIUserAbortError) {
    return new AiAnalysisError({
      code: "service_unavailable",
      status: 504,
      userMessage: AI_ANALYSIS_USER_MESSAGES.service_unavailable,
      cause: error,
    });
  }

  if (error instanceof APIConnectionError) {
    return new AiAnalysisError({
      code: "service_unavailable",
      status: 503,
      userMessage: AI_ANALYSIS_USER_MESSAGES.service_unavailable,
      cause: error,
    });
  }

  if (error instanceof AuthenticationError) {
    return new AiAnalysisError({
      code: "not_configured",
      status: 503,
      userMessage: AI_ANALYSIS_USER_MESSAGES.not_configured,
      cause: error,
    });
  }

  if (error instanceof RateLimitError && isBillingOrQuotaError(error)) {
    return new AiAnalysisError({
      code: "billing_unavailable",
      status: 503,
      userMessage: AI_ANALYSIS_USER_MESSAGES.billing_unavailable,
      cause: error,
    });
  }

  if (error instanceof APIError) {
    if (isBillingOrQuotaError(error)) {
      return new AiAnalysisError({
        code: "billing_unavailable",
        status: 503,
        userMessage: AI_ANALYSIS_USER_MESSAGES.billing_unavailable,
        cause: error,
      });
    }

    if (error instanceof InternalServerError || (error.status ?? 0) >= 500) {
      return new AiAnalysisError({
        code: "service_unavailable",
        status: 503,
        userMessage: AI_ANALYSIS_USER_MESSAGES.service_unavailable,
        cause: error,
      });
    }

    return new AiAnalysisError({
      code: "invalid_request",
      status: error.status ?? 400,
      userMessage: AI_ANALYSIS_USER_MESSAGES.service_unavailable,
      cause: error,
    });
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("openai_api_key") || message.includes("not configured")) {
      return new AiAnalysisError({
        code: "not_configured",
        status: 503,
        userMessage: AI_ANALYSIS_USER_MESSAGES.not_configured,
        cause: error,
      });
    }

    if (message.includes("timeout") || message.includes("timed out") || message.includes("abort")) {
      return new AiAnalysisError({
        code: "service_unavailable",
        status: 504,
        userMessage: AI_ANALYSIS_USER_MESSAGES.service_unavailable,
        cause: error,
      });
    }
  }

  return new AiAnalysisError({
    code: "service_unavailable",
    status: 500,
    userMessage: AI_ANALYSIS_USER_MESSAGES.service_unavailable,
    cause: error,
  });
}

export function assertAiAnalysisConfigured(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new AiAnalysisError({
      code: "not_configured",
      status: 503,
      userMessage: AI_ANALYSIS_USER_MESSAGES.not_configured,
    });
  }
}

export function createNexusOpenAiClient(): OpenAI {
  assertAiAnalysisConfigured();

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!.trim(),
    timeout: 60_000,
    maxRetries: 1,
  });
}
