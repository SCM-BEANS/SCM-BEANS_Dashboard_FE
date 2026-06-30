import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { cookies } from 'next/headers';

const axiosServer = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://idaas.netbird.cloud:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true', // Required for loca.lt to bypass the warning page
  },
  timeout: 10000,
});

// Request Interceptor
axiosServer.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Note: cookies() is a server-only function and must be called during request time
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosServer.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    if (!error.response) {
      console.error('Server Network error or API is down');
      return Promise.reject(error);
    }

    // Keep Server side simple: no complex refresh logic. We throw the error
    // and let the component handle redirects if necessary.
    if (error.response.status === 401) {
      console.warn('Server Unauthorized: Token may be expired.');
    }

    return Promise.reject(error.response.data || error.message);
  }
);

export default axiosServer;
