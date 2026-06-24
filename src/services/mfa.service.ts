import axiosClient from '@/lib/axios/axiosClient';
import { AUTH } from '@/constants/endpoints';
import { ApiResponse } from '@/types/api.type';

export interface MfaSetupResponse {
  secret: string;
}

export const mfaService = {
  /**
   * Initializes MFA. Returns the secret key.
   */
  initiateSetup: async (): Promise<ApiResponse<MfaSetupResponse>> => {
    return axiosClient.post(AUTH.MFA_SETUP);
  },

  /**
   * Returns the QR code image URL (blob URL).
   */
  getQrCodeUrl: async (email: string, secret: string): Promise<string> => {
    // If the endpoint returns a raw PNG image, we must set responseType to 'blob'
    const response: Blob = await axiosClient.get(AUTH.MFA_QRCODE, {
      params: { email, secret },
      responseType: 'blob',
    });
    
    // Convert Blob to a local Object URL
    return URL.createObjectURL(response);
  },

  /**
   * Confirms the setup with the 6-digit code.
   */
  confirmSetup: async (token: string, secret: string): Promise<ApiResponse<any>> => {
    return axiosClient.post(AUTH.MFA_CONFIRM, { token, secret });
  },
};
