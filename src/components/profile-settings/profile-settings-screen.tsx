import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Fingerprint, Mail, Phone, RefreshCw } from "lucide-react";
import { useState } from "react";
import { profilesApi } from "@/apis/profiles.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { Profile } from "@/schema/profiles.schema";
import styles from "./profile-settings-screen.module.css";

const profileStatusLabels: Record<Profile["status"], string> = {
  UNVERIFIED: "Chưa xác minh",
  PENDING_ASSIGNMENT: "Chờ phân công",
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã vô hiệu hóa",
};

const profileRoleLabels: Record<string, string> = {
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  OWNER: "Owner",
  TECHNICIAN: "Technician",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getInitials(fullName: string, email: string): string {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toLocaleUpperCase("vi-VN");
  }
  if (nameParts.length === 1) return nameParts[0].slice(0, 2).toLocaleUpperCase("vi-VN");
  return email.trim().slice(0, 1).toLocaleUpperCase("vi-VN") || "U";
}

export function ProfileSettingsScreen({ roleLabel }: { roleLabel: string }) {
  const queryClient = useQueryClient();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const profile = useQuery({
    queryKey: ["dolores", "profiles", "me"],
    queryFn: ({ signal }) => profilesApi.getCurrent(signal),
    retry: false,
  });
  const updatePhone = useMutation({
    mutationFn: ({ id, nextPhone }: { id: string; nextPhone: string }) =>
      profilesApi.updateContactInfo(id, { phone: nextPhone }),
    retry: false,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["dolores", "profiles", "me"], updatedProfile);
      setPhone(updatedProfile.phone ?? "");
      setIsEditingPhone(false);
    },
  });
  const currentProfile = profile.data;
  const canUpdatePhone = currentProfile?.roles.includes("ADMIN") ?? false;

  return (
    <div className={styles.pageContent}>
      <BackButtonHeading
        title="Hồ sơ cá nhân"
        titleId="profile-settings-heading"
        description={`Thông tin tài khoản ${roleLabel} đang sử dụng.`}
        back={null}
        className={styles.pageHeading}
      />

      <section className={styles.profileCard} aria-labelledby="profile-settings-heading">
        {profile.isPending ? <p className={styles.loading} role="status">Đang tải hồ sơ…</p> : null}
        {profile.isError ? (
          <div className={styles.notice} role="alert">
            <p>Không tải được hồ sơ: {getApiErrorMessage(profile.error)}</p>
            <ButtonBar type="button" disabled={profile.isFetching} onClick={() => void profile.refetch()}>
              Thử lại
            </ButtonBar>
          </div>
        ) : null}

        {currentProfile ? (
          <>
            <header className={styles.profileHero}>
              <div className={styles.avatar} aria-hidden="true">
                {getInitials(currentProfile.fullName, currentProfile.email)}
              </div>
              <div className={styles.identity}>
                <h2 id="profile-details-title">{currentProfile.fullName || "Chưa cập nhật họ tên"}</h2>
                <p className={styles.identityEmail}>{currentProfile.email || "Chưa có email"}</p>
                <div className={styles.identityBadges}>
                  {currentProfile.roles.length ? currentProfile.roles.map((role) => (
                    <span className={styles.roleBadge} key={role}>
                      {profileRoleLabels[role] ?? role}
                    </span>
                  )) : <span className={styles.roleBadge}>Chưa có vai trò</span>}
                  <StatusBadge status={currentProfile.status}>{profileStatusLabels[currentProfile.status]}</StatusBadge>
                  <span className={currentProfile.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge}>
                    {currentProfile.emailVerified ? <CheckCircle2 aria-hidden="true" size={15} /> : null}
                    {currentProfile.emailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                  </span>
                </div>
              </div>
            </header>

            <div className={styles.profileSections}>
              <section className={styles.detailSection} aria-labelledby="profile-contact-title">
                <div className={styles.sectionHeading}>
                  <h3 id="profile-contact-title">Thông tin liên hệ</h3>
                  <p>Email được đồng bộ từ IDaaS; số điện thoại do Dolores quản lý.</p>
                </div>
                <dl className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <dt><span className={styles.detailIcon}><Mail aria-hidden="true" size={19} /></span>Email</dt>
                    <dd>{currentProfile.email || "Chưa có email"}</dd>
                  </div>
                  <div className={styles.detailItem}>
                    <dt><span className={styles.detailIcon}><Phone aria-hidden="true" size={19} /></span>Số điện thoại</dt>
                    <dd className={styles.phoneValue}>
                      {isEditingPhone && canUpdatePhone ? (
                        <form
                          className={styles.phoneForm}
                          onSubmit={(event) => {
                            event.preventDefault();
                            const nextPhone = phone.trim();
                            if (!nextPhone || nextPhone === (currentProfile.phone ?? "").trim()) return;
                            updatePhone.mutate({ id: currentProfile.idaasUserId, nextPhone });
                          }}
                        >
                          <label className={styles.visuallyHidden} htmlFor="profile-phone-input">Số điện thoại</label>
                          <input
                            id="profile-phone-input"
                            type="tel"
                            autoComplete="tel"
                            maxLength={64}
                            required
                            value={phone}
                            aria-describedby="profile-phone-help"
                            onChange={(event) => setPhone(event.target.value)}
                          />
                          <p id="profile-phone-help" className={styles.phoneHelp}>Nhập số điện thoại theo định dạng bạn đang dùng.</p>
                          {updatePhone.isError ? (
                            <p className={styles.phoneError} role="alert">
                              Không cập nhật được số điện thoại: {getApiErrorMessage(updatePhone.error, "mutation")}
                            </p>
                          ) : null}
                          <div className={styles.phoneActions}>
                            <button
                              className={styles.savePhoneButton}
                              type="submit"
                              disabled={updatePhone.isPending || !phone.trim() || phone.trim() === (currentProfile.phone ?? "").trim()}
                            >
                              {updatePhone.isPending ? "Đang lưu…" : "Lưu số điện thoại"}
                            </button>
                            <button
                              className={styles.cancelPhoneButton}
                              type="button"
                              disabled={updatePhone.isPending}
                              onClick={() => {
                                updatePhone.reset();
                                setPhone(currentProfile.phone ?? "");
                                setIsEditingPhone(false);
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                            <span>{currentProfile.phone || "Chưa cập nhật"}</span>
                          {canUpdatePhone ? (
                            <button
                              className={styles.editPhoneButton}
                              type="button"
                              onClick={() => {
                                updatePhone.reset();
                                setPhone(currentProfile.phone ?? "");
                                setIsEditingPhone(true);
                              }}
                            >
                              Cập nhật số điện thoại
                            </button>
                          ) : (
                            <p className={styles.phoneHelp}>Liên hệ Admin để cập nhật số điện thoại.</p>
                          )}
                          {updatePhone.isSuccess ? <p className={styles.phoneSuccess} role="status">Đã cập nhật số điện thoại.</p> : null}
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className={styles.detailSection} aria-labelledby="profile-account-title">
                <div className={styles.sectionHeading}>
                  <h3 id="profile-account-title">Thông tin tài khoản</h3>
                  <p>Mã định danh và lịch sử hồ sơ của bạn.</p>
                </div>
                <dl className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <dt><span className={styles.detailIcon}><Fingerprint aria-hidden="true" size={19} /></span>Mã tài khoản IDaaS</dt>
                    <dd><TruncatedId value={currentProfile.idaasUserId} /></dd>
                  </div>
                  <div className={styles.detailItem}>
                    <dt><span className={styles.detailIcon}><CalendarDays aria-hidden="true" size={19} /></span>Ngày tạo hồ sơ</dt>
                    <dd>{formatDate(currentProfile.createdAt)}</dd>
                  </div>
                  <div className={styles.detailItem}>
                    <dt><span className={styles.detailIcon}><RefreshCw aria-hidden="true" size={19} /></span>Cập nhật gần nhất</dt>
                    <dd>{formatDate(currentProfile.updatedAt)}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
