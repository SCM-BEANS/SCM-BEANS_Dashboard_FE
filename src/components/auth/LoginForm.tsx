"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, Mail, ArrowRight, User, KeyRound } from 'lucide-react';
import { authService } from '@/services/auth.service';

interface LoginFormProps {
  onSuccess?: () => void;
  showBackground?: boolean;
}

export function LoginForm({ onSuccess, showBackground = false }: LoginFormProps) {
  const router = useRouter();
  
  // Modes: login, register, verify, forgot_password, reset_password, mfa_verify
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot_password' | 'reset_password' | 'mfa_verify'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');     // Used for login, register, and verify
  const [name, setName] = useState('');       // Used for register
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleResendOTP = async () => {
    if (!email) {
      setErrorMsg('Vui lòng nhập email để gửi lại OTP.');
      return;
    }
    
    setIsResending(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      await authService.resend(email);
      setSuccessMsg('Đã gửi lại mã OTP mới. Vui lòng kiểm tra email của bạn.');
    } catch (error: any) {
      console.error('Resend error:', error);
      setErrorMsg(typeof error === 'string' ? error : (error?.error || error?.message || 'Không thể gửi lại OTP.'));
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'login') {
      try {
        const response = await authService.login({ email, password });
        
        // Handle MFA Required Case
        if (response?.status === 'mfa_required' || response?.mfa_required || response?.temp_token) {
          setTempToken(response.temp_token);
          setMode('mfa_verify');
          setSuccessMsg('Vui lòng nhập mã xác thực 2 bước (2FA) để tiếp tục.');
          return;
        }

        localStorage.setItem('email', email);
        window.dispatchEvent(new CustomEvent('auth-change'));
        setSuccessMsg('Đăng nhập thành công!');
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else if (window.location.pathname === '/login') {
            router.push('/dashboard');
          } else {
            router.refresh();
          }
        }, 500);
      } catch (error: any) {
        console.error('Login error:', error);
        const msgStr = typeof error === 'string' ? error : (error?.message || error?.error || error?.title || JSON.stringify(error));
        
        // Handle MFA Required Case if returned as an error
        if (msgStr.toLowerCase().includes('mfa_required') || error?.status === 'mfa_required' || error?.mfa_required || error?.temp_token) {
          setTempToken(error?.temp_token || '');
          setMode('mfa_verify');
          setSuccessMsg('Vui lòng nhập mã xác thực 2 bước (2FA) để tiếp tục.');
        } 
        // Handle unverified email (usually 403 or contains verification keyword)
        else if (msgStr.toLowerCase().includes('verif') || error?.status === 403 || error?.statusCode === 403) {
          setSuccessMsg('Tài khoản chưa xác thực. OTP đã được gửi về email của bạn.');
          setMode('verify');
        } else {
          // If error is an empty object {}, msgStr will be "[object Object]" or "{}"
          const finalErrorMsg = (msgStr === '{}' || msgStr === '[object Object]') 
            ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.' 
            : msgStr;
          setErrorMsg(finalErrorMsg);
        }
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'register') {
      try {
        await authService.register({ email, name, password });
        setSuccessMsg('Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.');
        setMode('verify');
      } catch (error: any) {
        console.error('Registration error:', error);
        const msgStr = typeof error === 'string' ? error : (error?.error || error?.message || 'Đã có lỗi xảy ra khi đăng ký.');
        
        let finalMsg = msgStr;
        if (finalMsg.includes("Field validation for 'Password' failed on the 'min' tag")) {
          finalMsg = 'Mật khẩu cần tối thiểu 8 ký tự.';
        }

        setErrorMsg(finalMsg);
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'verify') {
      try {
        await authService.verify({ code: otpCode, email });
        setSuccessMsg('Xác thực thành công! Bạn có thể đăng nhập ngay.');
        setMode('login');
        setPassword('');
        setOtpCode('');
      } catch (error: any) {
        console.error('Verify error:', error);
        setErrorMsg(typeof error === 'string' ? error : (error?.error || error?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.'));
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'forgot_password') {
      try {
        await authService.forgotPasswordSendOTP(email);
        setSuccessMsg('Mã xác nhận đã được gửi. Vui lòng kiểm tra email.');
        setMode('reset_password');
      } catch (error: any) {
        console.error('Forgot password error:', error);
        setErrorMsg(typeof error === 'string' ? error : (error?.error || error?.message || 'Không thể gửi yêu cầu.'));
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'reset_password') {
      try {
        await authService.forgotPasswordReset({ email, otp: otpCode });
        setSuccessMsg('Mật khẩu tạm thời đã được gửi vào email của bạn. Vui lòng dùng nó để đăng nhập.');
        setMode('login');
        setPassword('');
        setOtpCode('');
      } catch (error: any) {
        console.error('Reset password error:', error);
        setErrorMsg(typeof error === 'string' ? error : (error?.error || error?.message || 'Mã OTP không hợp lệ.'));
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'mfa_verify') {
      try {
        await authService.loginMfa({ temp_token: tempToken, code: otpCode });
        
        localStorage.setItem('email', email);
        window.dispatchEvent(new CustomEvent('auth-change'));
        setSuccessMsg('Đăng nhập thành công!');
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else if (window.location.pathname === '/login') {
            router.push('/dashboard');
          } else {
            router.refresh();
          }
        }, 500);
      } catch (error: any) {
        console.error('MFA Login error:', error);
        setErrorMsg(typeof error === 'string' ? error : (error?.error || error?.message || 'Mã 2FA không chính xác hoặc đã hết hạn.'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formContent = (
    <div className="relative z-10 w-full max-w-md mx-auto">
      <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-[2.5rem]" />
      <div className="relative p-8 bg-surface/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-surface-container border border-outline/30 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Coffee className="text-primary w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-on-surface tracking-tight mb-2">
            Deer Coffee
          </h1>
          <p className="text-on-surface-variant text-sm text-center">
            {mode === 'login' ? 'Sign in to access the Dashboard' : 
             mode === 'register' ? 'Create an account to continue' :
             mode === 'forgot_password' ? 'Enter your email to reset password' :
             mode === 'reset_password' ? 'Enter the OTP to receive a temporary password' :
             mode === 'mfa_verify' ? 'Nhập mã 6 số từ Google Authenticator' :
             'Enter the 6-digit OTP sent to your email'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            
            {/* Login, Register & Forgot Password Email Field */}
            {mode !== 'verify' && mode !== 'reset_password' && mode !== 'mfa_verify' && (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-on-surface-variant" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                    placeholder="Email address"
                  />
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-on-surface-variant" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      placeholder="Full Name"
                    />
                  </div>
                )}

                {(mode === 'login' || mode === 'register') && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-on-surface-variant" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={mode === 'register' ? 8 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      placeholder={mode === 'register' ? "Password (ít nhất 8 ký tự)" : "Password"}
                    />
                  </div>
                )}
              </>
            )}

            {/* Verify, Reset Password, & MFA OTP Fields */}
            {(mode === 'verify' || mode === 'reset_password' || mode === 'mfa_verify') && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-on-surface-variant" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-12 pr-4 py-3 bg-surface border border-white/10 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-center tracking-[0.5em] font-mono text-xl"
                  placeholder="000000"
                />
              </div>
            )}
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-white/10 bg-surface text-primary focus:ring-primary/50 w-4 h-4" />
                <span className="text-on-surface-variant hover:text-on-surface transition-colors">Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={() => {
                  setMode('forgot_password');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-primary hover:text-primary-light transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full group relative flex items-center justify-center space-x-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10">
              {isLoading ? 'Processing...' : 
               mode === 'login' ? 'Sign In' : 
               mode === 'register' ? 'Sign Up' : 
               mode === 'forgot_password' ? 'Send OTP' :
               mode === 'reset_password' ? 'Confirm OTP' :
               mode === 'mfa_verify' ? 'Xác nhận mã 2FA' : 'Verify Account'}
            </span>
            {!isLoading && (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
            )}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </form>

        <div className="mt-6 flex flex-col space-y-3 text-center text-sm">
          {(mode === 'verify' || mode === 'reset_password' || mode === 'mfa_verify') ? (
            <>
              {mode === 'verify' && (
                <div>
                  <span className="text-on-surface-variant">Không nhận được mã? </span>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isResending}
                    className="text-primary hover:text-primary-light transition-colors font-medium disabled:opacity-50"
                  >
                    {isResending ? 'Đang gửi...' : 'Gửi lại OTP'}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-on-surface-variant hover:text-on-surface transition-colors font-medium"
              >
                Back to Sign in
              </button>
            </>
          ) : mode === 'forgot_password' ? (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-on-surface-variant hover:text-on-surface transition-colors font-medium"
            >
              Back to Sign in
            </button>
          ) : (
            <>
              <span className="text-on-surface-variant">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-primary hover:text-primary-light transition-colors font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-on-surface-variant/70">
          <p>Protected System. Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );

  if (showBackground) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/coffee-doodle-bg-light.png')",
          backgroundSize: '400px',
          backgroundRepeat: 'repeat'
        }}
      >
        {formContent}
      </div>
    );
  }

  return formContent;
}
