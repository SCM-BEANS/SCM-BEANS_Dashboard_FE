import { axiosClient } from "@/lib/http";
import {
  LoginMfaRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LoginSuccessResponseSchema,
  FirstLoginPasswordChangeRequestSchema,
  FirstLoginPasswordChangeResponseSchema,
  ResendEmailVerificationRequestSchema,
  VerifyEmailRequestSchema,
  type TFirstLoginPasswordChangeRequest,
  type TLoginMfaRequest,
  type TLoginMfaResponse,
  type TLoginRequest,
  type TLoginResponse,
  type TResendEmailVerificationRequest,
  type TVerifyEmailRequest,
} from "@/schema/auth.schema";

export const authApi = {
  async login(credentials: TLoginRequest): Promise<TLoginResponse> {
    const request = LoginRequestSchema.parse(credentials);
    const response = await axiosClient.post<unknown>("/auth/login", request);
    return LoginResponseSchema.parse(response.data);
  },

  async loginMfa(data: TLoginMfaRequest): Promise<TLoginMfaResponse> {
    const request = LoginMfaRequestSchema.parse(data);
    const response = await axiosClient.post<unknown>("/auth/login/mfa", request);
    return LoginSuccessResponseSchema.parse(response.data);
  },

  async verifyEmail(data: TVerifyEmailRequest): Promise<void> {
    const request = VerifyEmailRequestSchema.parse(data);
    await axiosClient.post("/auth/verify", request);
  },

  async resendEmailVerification(data: TResendEmailVerificationRequest): Promise<void> {
    const request = ResendEmailVerificationRequestSchema.parse(data);
    await axiosClient.post("/auth/resend", request);
  },

  async changeFirstLoginPassword(data: TFirstLoginPasswordChangeRequest): Promise<void> {
    const request = FirstLoginPasswordChangeRequestSchema.parse(data);
    const response = await axiosClient.post<unknown>(
      "/auth/first-login/password-change",
      request,
    );
    FirstLoginPasswordChangeResponseSchema.parse(response.data);
  },

  async logout(): Promise<void> {
    await axiosClient.post("/auth/logout", {});
  },
};
