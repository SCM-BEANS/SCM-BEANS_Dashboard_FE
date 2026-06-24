import React from 'react';
import { MfaSetupForm } from '@/components/mfa/MfaSetupForm';
import { Shield } from 'lucide-react';

export default function SecuritySettingsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex items-center gap-4 border-b border-outline pb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bảo mật (Security)</h1>
            <p className="text-on-surface-variant mt-1">
              Quản lý cài đặt bảo mật và xác thực 2 bước cho tài khoản của bạn.
            </p>
          </div>
        </div>

        {/* 2FA Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Two-Factor Authentication (2FA)</h2>
            <p className="text-on-surface-variant max-w-2xl">
              Thêm một lớp bảo mật phụ cho tài khoản của bạn. Khi đăng nhập, bạn sẽ cần cung cấp mật khẩu và một mã xác minh từ ứng dụng authenticator.
            </p>
          </div>

          <MfaSetupForm />
        </section>

      </div>
    </div>
  );
}
