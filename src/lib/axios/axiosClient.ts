import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { AUTH } from '@/constants/endpoints';

const axiosClient = axios.create({
  // Use relative path to hit the Next.js proxy (which bypasses CORS)
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true', // Required for loca.lt to bypass the warning page
  },
  timeout: 10000,
});

// -- Mutex & Concurrency Queue for Refresh Token --
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read access_token from cookies
    const token = Cookies.get('access_token');

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
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return standard response data
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      console.error('Network error or API is down');
      return Promise.reject(error);
    }

    // 401 Unauthorized handling & Theft Detection Prevention
    if (error.response.status === 401 && originalRequest) {
      // Skip refresh logic if the request was already trying to login or refresh
      if (originalRequest.url?.includes(AUTH.LOGIN) || originalRequest.url?.includes(AUTH.REFRESH)) {
        return Promise.reject(error.response.data || error);
      }

      if (isRefreshing) {
        // If already refreshing, pause this request and add it to the queue
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Cannot read refresh_token because it is HttpOnly. The browser will attach it automatically.
      return new Promise((resolve, reject) => {
        // Call the refresh endpoint EXACTLY ONCE
        axiosClient
          .post(AUTH.REFRESH, {})
          .then((res: any) => {
            const newAccessToken = res.data?.access_token || res.access_token;
            const newRefreshToken = res.data?.refresh_token || res.refresh_token;

            // Update cookies with new tokens
            Cookies.set('access_token', newAccessToken, { expires: 15 / (24 * 60), secure: true });
            Cookies.set('refresh_token', newRefreshToken, { expires: 7, secure: true });

            // Update Authorization header for original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            // Process queued requests
            processQueue(null, newAccessToken);

            // Retry the original request
            resolve(axiosClient(originalRequest));
          })
          .catch((err) => {
            // Refresh failed (e.g., token expired, or theft detection locked the account)
            processQueue(err, null);
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');
            if (typeof window !== 'undefined') window.location.href = '/login';
            reject(err.response?.data || err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Handle other errors (400, 403, 500, etc.)
    return Promise.reject(error.response.data || error.message);
  }
);

export default axiosClient;
