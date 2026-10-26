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

export const LoginPasswordChangeRequiredResponseSchema = z.object({
  requires_password_change: z.literal(true).optional(),
  password_change_required: z.literal(true).optional(),
  challenge: z.string().min(32).max(128),
}).passthrough();

export const LoginResponseSchema = z.union([
  LoginSuccessResponseSchema,
  LoginMfaRequiredResponseSchema,
  LoginPasswordChangeRequiredResponseSchema,
]);

export const LoginMfaRequestSchema = z.object({
  temp_token: z.string().min(1),
  code: z.string().trim().min(1),
}).strict();

export const VerifyEmailRequestSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/),
}).strict();

export const ResendEmailVerificationRequestSchema = z.object({
  email: z.string().trim().email(),
}).strict();

export const FirstLoginPasswordChangeRequestSchema = z.object({
  challenge: z.string().min(32).max(128),
  new_password: z.string().min(8).max(72),
}).strict();

export const FirstLoginPasswordChangeResponseSchema = z.object({
  login_required: z.boolean().optional(),
  message: z.string().optional(),
}).passthrough();

export type TLoginRequest = z.infer<typeof LoginRequestSchema>;
export type TLoginResponse = z.infer<typeof LoginResponseSchema>;
export type TLoginMfaRequest = z.infer<typeof LoginMfaRequestSchema>;
export type TLoginMfaResponse = z.infer<typeof LoginSuccessResponseSchema>;
export type TVerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type TResendEmailVerificationRequest = z.infer<typeof ResendEmailVerificationRequestSchema>;
export type TFirstLoginPasswordChangeRequest = z.infer<typeof FirstLoginPasswordChangeRequestSchema>;
