"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { ShieldCheck, Smartphone, QrCode, KeyRound, Copy, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { mfaService } from '@/services/mfa.service';

type Step = 1 | 2 | 3 | 4;

export function MfaSetupForm() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch email on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Initiate setup
      const setupRes: any = await mfaService.initiateSetup();
      const newSecret = setupRes?.secret || setupRes?.data?.secret || '';
      if (!newSecret) throw new Error('Không nhận được mã bí mật từ máy chủ.');
      setSecret(newSecret);

      // 2. Fetch QR Code URL (Blob)
      const userEmail = email || 'user@example.com';
      const qrUrl = await mfaService.getQrCodeUrl(userEmail, newSecret);
      
      setQrCodeUrl(qrUrl);
      
      setStep(2);
    } catch (err: any) {
      console.error('MFA Setup Error:', err);
      setErrorMsg(typeof err === 'string' ? err : (err?.error || err?.message || 'Không thể khởi tạo MFA.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    // Could show a mini toast here if desired
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (tokenInput.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 số.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await mfaService.confirmSetup(tokenInput, secret);
      setSuccessMsg('Thiết lập xác thực 2 bước (2FA) thành công!');
      setStep(4);
    } catch (err: any) {
      console.error('MFA Confirm Error:', err);
      setErrorMsg(typeof err === 'string' ? err : (err?.error || err?.message || 'Mã xác nhận không hợp lệ.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Steps Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-outline rounded-full -z-10"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full -z-10 transition-all duration-500"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-surface transition-colors duration-300 ${
              step >= s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {s === 4 && step === 4 ? <CheckCircle2 className="w-5 h-5" /> : s}
          </div>
        ))}
      </div>

      <div className="bg-surface border border-outline rounded-2xl shadow-xl p-6 md:p-8">
        {/* Global Error message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-start gap-2">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}

        {/* STEP 1: Download App */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-2xl mb-6 mx-auto">
              <Smartphone className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-center text-on-surface mb-4">Tải ứng dụng Authenticator</h2>
            <p className="text-on-surface-variant text-center mb-8">
              Để bắt đầu, bạn cần cài đặt một ứng dụng tạo mã xác thực trên điện thoại của mình. 
              Chúng tôi khuyên dùng <strong>Google Authenticator</strong>, <strong>Authy</strong>, hoặc <strong>Microsoft Authenticator</strong>.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container hover:bg-outline border border-outline rounded-xl transition-colors">
                <span className="font-medium text-sm text-on-surface">Google Play</span>
              </a>
              <a href="https://apps.apple.com/us/app/google-authenticator/id388497605" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container hover:bg-outline border border-outline rounded-xl transition-colors">
                <span className="font-medium text-sm text-on-surface">App Store</span>
              </a>
            </div>

            <button
              onClick={handleStartSetup}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-6 rounded-xl font-bold transition-all disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Đã cài đặt xong, tiếp tục</span>}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* STEP 2: Scan QR Code */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-2xl mb-6 mx-auto">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-center text-on-surface mb-4">Quét mã QR</h2>
            <p className="text-on-surface-variant text-center mb-8">
              Mở ứng dụng Authenticator trên điện thoại và quét mã QR dưới đây.
            </p>
            
            <div className="flex justify-center mb-8">
              {qrCodeUrl ? (
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-outline">
                  <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-surface-container rounded-2xl flex items-center justify-center border border-outline border-dashed">
                  <span className="text-on-surface-variant text-sm">Đang tải ảnh...</span>
                </div>
              )}
            </div>

            <div className="bg-surface-container rounded-xl p-4 mb-8">
              <p className="text-sm text-on-surface-variant mb-2">Không thể quét mã QR? Nhập mã bí mật này thủ công:</p>
              <div className="flex items-center justify-between bg-surface border border-outline rounded-lg p-3">
                <code className="text-primary font-mono tracking-wider font-bold">{secret}</code>
                <button 
                  onClick={handleCopySecret}
                  className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 flex items-center justify-center bg-surface-container hover:bg-outline text-on-surface py-3 px-6 rounded-xl font-bold transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-6 rounded-xl font-bold transition-all"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm OTP */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-2xl mb-6 mx-auto">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-center text-on-surface mb-4">Xác nhận mã OTP</h2>
            <p className="text-on-surface-variant text-center mb-8">
              Nhập mã 6 số hiển thị trên ứng dụng Authenticator của bạn để hoàn tất thiết lập.
            </p>
            
            <form onSubmit={handleConfirm} className="space-y-6">
              <div className="relative max-w-xs mx-auto">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full py-4 bg-surface border-2 border-outline rounded-xl text-on-surface focus:outline-none focus:border-primary transition-all duration-300 text-center tracking-[0.75em] font-mono text-3xl font-bold"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 flex items-center justify-center bg-surface-container hover:bg-outline text-on-surface py-3 px-6 rounded-xl font-bold transition-all"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading || tokenInput.length !== 6}
                  className="w-2/3 flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-on-primary py-3 px-6 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Xác nhận</span>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-center text-on-surface mb-2">Thành công!</h2>
            <p className="text-on-surface-variant text-center mb-8">
              Tài khoản của bạn đã được bảo vệ bằng Xác thực 2 bước (2FA).
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-surface-container hover:bg-outline text-on-surface py-3 px-8 rounded-xl font-bold transition-all"
            >
              Trở về cài đặt
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
