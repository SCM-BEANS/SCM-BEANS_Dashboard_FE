import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
}).strict();

export const LoginSuccessResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
}).passthrough();

export const LoginMfaRequiredResponseSchema = z.object({
  temp_token: z.string().min(1),
  status: z.literal("mfa_required").optional(),
  mfa_required: z.literal(true).optional(),
}).passthrough();

export const LoginResponseSchema = z.union([
  LoginSuccessResponseSchema,
  LoginMfaRequiredResponseSchema,
]);

export const LoginMfaRequestSchema = z.object({
  temp_token: z.string().min(1),
  code: z.string().trim().min(1),
}).strict();

export type TLoginRequest = z.infer<typeof LoginRequestSchema>;
export type TLoginResponse = z.infer<typeof LoginResponseSchema>;
export type TLoginMfaRequest = z.infer<typeof LoginMfaRequestSchema>;
export type TLoginMfaResponse = z.infer<typeof LoginSuccessResponseSchema>;
