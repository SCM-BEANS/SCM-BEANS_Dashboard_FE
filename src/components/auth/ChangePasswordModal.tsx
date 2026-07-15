"use client";

import { useState, type FormEvent } from 'react';
import { Lock, KeyRound, ArrowRight, X } from 'lucide-react';
import { authService } from '@/services/auth.service';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [mode, setMode] = useState<'request' | 'confirm'>('request');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setMode('request');
    setOldPassword('');
    setNewPassword('');
    setOtpCode('');
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authService.passwordChangeSendOTP();
      setSuccessMsg('Mã OTP đã được gửi. Vui lòng kiểm tra email của bạn.');
      setMode('confirm');
    } catch (error: any) {
      console.error('Send OTP error:', error);
      setErrorMsg(typeof error === 'string' ? error : (error?.error || error?.message || 'Không thể gửi OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authService.passwordChange({
        old_password: oldPassword,
        new_password: newPassword,
        otp_code: otpCode,
      });
      setSuccessMsg('Đổi mật khẩu thành công!');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error('Change password error:', error);
      const msgStr = typeof error === 'string' ? error : (error?.error || error?.message || 'Không thể đổi mật khẩu.');
      
      let finalMsg = msgStr;
      if (finalMsg.includes("Field validation for 'NewPassword' failed on the 'min' tag")) {
        finalMsg = 'Mật khẩu cần tối thiểu 8 ký tự.';
      } else if (finalMsg.includes("Field validation for 'OldPassword' failed on the 'min' tag")) {
        finalMsg = 'Mật khẩu cũ cần tối thiểu 8 ký tự.';
      }

      setErrorMsg(finalMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-surface border border-outline rounded-2xl shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-on-surface mb-2">Đổi mật khẩu</h2>
        <p className="text-sm text-on-surface-variant mb-6">
          {mode === 'request'
            ? 'Để đảm bảo an toàn, hệ thống sẽ gửi một mã OTP về email của bạn.'
            : 'Nhập mật khẩu cũ, mật khẩu mới và mã OTP để hoàn tất.'}
        </p>

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

        {mode === 'request' ? (
          <button
            onClick={handleSendOTP}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-70"
          >
            <span>{isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}</span>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-on-surface-variant" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-outline rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Mật khẩu cũ (ít nhất 8 ký tự)"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-on-surface-variant" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-outline rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
              />
            </div>

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
                className="w-full pl-12 pr-4 py-3 bg-surface border border-outline rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono tracking-widest text-center"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full group flex items-center justify-center space-x-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-70"
            >
              <span>{isLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
