import { axiosClient } from "@/lib/http";
import {
  LoginMfaRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LoginSuccessResponseSchema,
  type TLoginMfaRequest,
  type TLoginMfaResponse,
  type TLoginRequest,
  type TLoginResponse,
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

  async logout(): Promise<void> {
    await axiosClient.post("/auth/logout", {});
  },
};
