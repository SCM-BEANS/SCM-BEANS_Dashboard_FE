import Cookies from 'js-cookie';
import axiosClient from '@/lib/axios/axiosClient';
import { AUTH } from '@/constants/endpoints';
import { LoginResponse, ApiResponse, User } from '@/types/api.type';

export const authService = {
  /**
   * Logs in a user, extracts tokens, and sets them in js-cookie.
   * Access token expires in 15 minutes, refresh token expires in 7 days.
   */
  login: async (credentials: Record<string, string>): Promise<any> => {
    // Note: Because interceptor extracts data, response IS the payload
    const response: any = await axiosClient.post(AUTH.LOGIN, credentials);
    
    const { access_token } = response;

    if (access_token) {
      Cookies.set('access_token', access_token, { expires: 15 / (24 * 60), secure: true }); // 15 mins
      // refresh_token is automatically set by the backend via HttpOnly Set-Cookie header
    }

    return response;
  },

  /**
   * Completes login with MFA code
   */
  loginMfa: async (data: { temp_token: string; code: string }): Promise<any> => {
    const response: any = await axiosClient.post(AUTH.LOGIN_MFA, data);
    
    const { access_token } = response;
    if (access_token) {
      Cookies.set('access_token', access_token, { expires: 15 / (24 * 60), secure: true }); // 15 mins
    }
    
    return response;
  },

  /**
   * Logs out the user by clearing cookies.
   */
  logout: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    // Can trigger a redirect to /login here if needed or handled by component
  },

  /**
   * Registers a new user
   */
  register: async (data: Record<string, any>): Promise<ApiResponse<User>> => {
    return axiosClient.post(AUTH.REGISTER, data);
  },

  /**
   * Verifies an email with a 6-digit OTP token
   */
  verify: async (data: { code: string; email: string }): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.VERIFY, data);
  },

  /**
   * Resends verification email
   */
  resend: async (email: string): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.RESEND, { email });
  },

  /**
   * Setup MFA
   */
  mfaSetup: async (): Promise<ApiResponse<{ secret: string; qrCode: string }>> => {
    return axiosClient.post(AUTH.MFA_SETUP);
  },

  /**
   * Confirm MFA Setup
   */
  mfaConfirm: async (code: string): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.MFA_CONFIRM, { code });
  },

  /**
   * Send OTP for forgot password
   */
  forgotPasswordSendOTP: async (email: string): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.FORGOT_PASSWORD_SEND_OTP, { email });
  },

  /**
   * Reset password with OTP
   */
  forgotPasswordReset: async (data: Record<string, string>): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.FORGOT_PASSWORD_RESET, data);
  },

  passwordChangeSendOTP: async (): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.PASSWORD_CHANGE_SEND_OTP, {});
  },

  /**
   * Change password with OTP (requires auth)
   */
  passwordChange: async (data: Record<string, string>): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.PASSWORD_CHANGE, data);
  },
};
