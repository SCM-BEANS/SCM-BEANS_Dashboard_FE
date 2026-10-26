import axios from "axios";
import { ZodError } from "zod";
import { APP_MESSAGES } from "@/constants/messages";

export const API_ERROR_MESSAGES = APP_MESSAGES.API_ERROR;

export type ApiErrorIntent = "read" | "mutation" | "login" | "mfa";

export class AccountCreatedResponseValidationError extends Error {
  constructor() {
    super("The account was created, but its response did not match the expected format.");
    this.name = "AccountCreatedResponseValidationError";
  }
}

export function isUncertainApiMutation(error: unknown): boolean {
  if (error instanceof ZodError) return true;
  if (!axios.isAxiosError(error)) return false;

  const response = error.response;
  return !response || response.status >= 500;
}

export function getApiErrorMessage(error: unknown, intent: ApiErrorIntent = "read"): string {
  if (error instanceof AccountCreatedResponseValidationError) {
    return API_ERROR_MESSAGES.ACCOUNT_CREATED_RESPONSE_INVALID;
  }

  if (intent === "login" || intent === "mfa") {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return intent === "mfa"
          ? API_ERROR_MESSAGES.INVALID_MFA_CODE
          : API_ERROR_MESSAGES.INVALID_CREDENTIALS;
      }
      if (error.response?.status === 403) return API_ERROR_MESSAGES.LOGIN_ACCOUNT_NOT_READY;
      if (error.response?.status === 429) return API_ERROR_MESSAGES.RATE_LIMITED;
      if (!error.response || error.response.status >= 500) return API_ERROR_MESSAGES.LOGIN_UNAVAILABLE;
    }
    return API_ERROR_MESSAGES.LOGIN_GENERIC;
  }

  if (error instanceof ZodError) {
    return intent === "mutation"
      ? API_ERROR_MESSAGES.UNCERTAIN_MUTATION
      : API_ERROR_MESSAGES.INVALID_RESPONSE;
  }
  if (!axios.isAxiosError(error)) return API_ERROR_MESSAGES.GENERIC;

  const response = error.response;
  if (!response || response.status >= 500) {
    return intent === "mutation"
      ? API_ERROR_MESSAGES.UNCERTAIN_MUTATION
      : API_ERROR_MESSAGES.UNAVAILABLE;
  }

  const status = response.status;
  if (status === 400 || status === 422) return API_ERROR_MESSAGES.INVALID_REQUEST;
  if (status === 401) return API_ERROR_MESSAGES.UNAUTHENTICATED;
  if (status === 403) return API_ERROR_MESSAGES.FORBIDDEN;
  if (status === 404) return API_ERROR_MESSAGES.NOT_FOUND;
  if (status === 409) return API_ERROR_MESSAGES.CONFLICT;
  if (status === 429) return API_ERROR_MESSAGES.RATE_LIMITED;
  return API_ERROR_MESSAGES.GENERIC;
}
