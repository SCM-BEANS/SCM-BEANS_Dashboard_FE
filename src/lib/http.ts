import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { PATH_AUTH } from "@/routes/path";
import { LoginSuccessResponseSchema } from "@/schema/auth.schema";

export const axiosClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

export const DOLORES_API_BASE_URL = "/api/dolores/v1";

const unauthenticatedPaths = new Set([
  "/auth/login",
  "/auth/login/mfa",
  "/auth/refresh",
  "/auth/logout",
  "/auth/verify",
  "/auth/resend",
  "/auth/first-login/password-change",
]);

function requestPath(url?: string): string | undefined {
  return url?.split("?", 1)[0]?.replace(/\/+$/, "");
}

let refreshInFlight: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = axiosClient
      .post<unknown>("/auth/refresh", {})
      .then(({ data }) => {
        const response = LoginSuccessResponseSchema.parse(data);
        Cookies.set("access_token", response.access_token, {
          expires: response.expires_in / 86_400,
          path: "/",
          sameSite: "lax",
          secure: window.location.protocol === "https:",
        });
        return response.access_token;
      })
      .catch((error: unknown) => {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          Cookies.remove("access_token", { path: "/" });
          if (window.location.pathname !== PATH_AUTH.LOGIN) {
            window.location.assign(PATH_AUTH.LOGIN);
          }
        }
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

axiosClient.interceptors.request.use((config) => {
  if (unauthenticatedPaths.has(requestPath(config.url) || "")) {
    config.headers.delete("Authorization");
    return config;
  }

  const token = typeof window === "undefined" ? undefined : Cookies.get("access_token");
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      typeof window === "undefined" ||
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      unauthenticatedPaths.has(requestPath(request.url) || "")
    ) {
      return Promise.reject(error);
    }

    request._retry = true;
    const token = await refreshAccessToken();
    request.headers.set("Authorization", `Bearer ${token}`);
    return axiosClient(request);
  },
);
