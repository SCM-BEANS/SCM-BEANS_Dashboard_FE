import { useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import {
  LoginMfaRequiredResponseSchema,
  LoginPasswordChangeRequiredResponseSchema,
  LoginSuccessResponseSchema,
} from "@/schema/auth.schema";
import { getPostLoginPath } from "@/lib/auth-role";
import styles from "./dev-quick-login-controls.module.css";

type AccountKey = "ADMIN" | "MODERATOR" | "TECHNICIAN" | "OWNER_PRIMARY" | "OWNER_SECONDARY";
type Props = { floating?: boolean };

const ownerAccounts: Array<{ key: AccountKey; email: string }> = [
  { key: "OWNER_PRIMARY", email: "owner@gmail.com" },
  { key: "OWNER_SECONDARY", email: "khanglove9999k@gmail.com" },
];

const roles: Array<{ key: AccountKey; label: string; email: string }> = [
  { key: "ADMIN", label: "Admin", email: "admin@gmail.com" },
  { key: "MODERATOR", label: "Moderator", email: "moder@gmail.com" },
  { key: "TECHNICIAN", label: "Technician", email: "tech@gmail.com" },
];

export function DevQuickLoginControls({ floating = false }: Props) {
  const router = useRouter();
  const [showOwners, setShowOwners] = useState(false);
  const [activeAccount, setActiveAccount] = useState<AccountKey | null>(null);
  const [message, setMessage] = useState("");

  if (process.env.NODE_ENV !== "development" || (floating && router.pathname === "/quick-login")) return null;

  const login = async (account: AccountKey) => {
    setActiveAccount(account);
    setMessage("");
    if (account.startsWith("OWNER")) setShowOwners(false);

    try {
      const response = await fetch("/api/dev-quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const body: unknown = await response.json();

      if (LoginMfaRequiredResponseSchema.safeParse(body).success) {
        setMessage("Tài khoản yêu cầu MFA. Hãy đăng nhập qua trang đăng nhập thông thường.");
        return;
      }
      if (LoginPasswordChangeRequiredResponseSchema.safeParse(body).success) {
        setMessage("Tài khoản cần đổi mật khẩu lần đầu. Hãy đăng nhập qua trang đăng nhập thông thường.");
        return;
      }
      if (!response.ok) {
        const errorBody = body as { message?: unknown; error?: unknown };
        throw new Error(
          typeof errorBody.message === "string"
            ? errorBody.message
            : typeof errorBody.error === "string"
              ? errorBody.error
              : "Đăng nhập thất bại.",
        );
      }

      const result = LoginSuccessResponseSchema.parse(body);
      Cookies.set("access_token", result.access_token, {
        expires: result.expires_in / 86_400,
        path: "/",
        sameSite: "lax",
        secure: window.location.protocol === "https:",
      });
      await router.replace(getPostLoginPath(result.access_token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đăng nhập nhanh.");
    } finally {
      setActiveAccount(null);
    }
  };

  const buttonStyle = (disabled: boolean) => ({
    width: "100%",
    minHeight: 46,
    padding: "10px 14px",
    border: "1px solid #e8dfd9",
    borderRadius: 10,
    background: disabled ? "#f3f0ed" : "#fff",
    color: "#302927",
    font: "inherit",
    fontSize: 14,
    fontWeight: 600,
    textAlign: "left" as const,
    cursor: disabled ? "wait" : "pointer",
  });

  if (floating) {
    return (
      <nav className={styles.dock} aria-label="Đăng nhập nhanh theo vai trò">
        <span className={styles.devLabel}>DEV</span>
        {roles.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={styles.roleButton}
            disabled={Boolean(activeAccount)}
            aria-busy={activeAccount === key || undefined}
            onClick={() => void login(key)}
          >
            {activeAccount === key ? "Đang vào…" : label}
          </button>
        ))}
        <div className={styles.ownerMenu}>
          <button
            type="button"
            className={`${styles.roleButton} ${showOwners ? styles.roleButtonActive : ""}`}
            disabled={Boolean(activeAccount)}
            aria-expanded={showOwners}
            aria-haspopup="menu"
            onClick={() => setShowOwners((value) => !value)}
          >
            {activeAccount?.startsWith("OWNER") ? "Đang vào…" : "Owner ▾"}
          </button>
          {showOwners ? (
            <div className={styles.dropdown} role="menu" aria-label="Chọn tài khoản Owner">
              {ownerAccounts.map(({ key, email }) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(activeAccount)}
                  onClick={() => void login(key)}
                >
                  {activeAccount === key ? "Đang đăng nhập…" : email}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {message ? <p className={styles.status} role="alert">{message}</p> : null}
      </nav>
    );
  }

  const panel = (
    <section style={{ width: "100%", padding: 28, border: "1px solid #e8dfd9", borderRadius: 16, background: "#fff", color: "#302927", boxShadow: "0 12px 36px #30292712" }}>
      <p style={{ margin: "0 0 7px", color: "#9f252a", fontSize: 12, fontWeight: 700, letterSpacing: ".04em" }}>DEVELOPMENT ONLY</p>
      <h2 style={{ margin: "0 0 7px", fontSize: 28 }}>Đăng nhập nhanh</h2>
      <p style={{ margin: "0 0 18px", color: "#706864" }}>Chọn vai trò để đăng nhập bằng tài khoản local.</p>
      <div style={{ display: "grid", gap: 8 }}>
        {roles.map(({ key, label, email }) => (
          <button key={key} type="button" style={buttonStyle(Boolean(activeAccount))} disabled={Boolean(activeAccount)} onClick={() => void login(key)}>
            {activeAccount === key ? `Đang đăng nhập ${label}…` : `${label} · ${email}`}
          </button>
        ))}
        <button type="button" style={buttonStyle(Boolean(activeAccount))} disabled={Boolean(activeAccount)} aria-expanded={showOwners} onClick={() => setShowOwners((value) => !value)}>
          Owner · chọn tài khoản {showOwners ? "▲" : "▼"}
        </button>
        {showOwners ? ownerAccounts.map(({ key, email }) => (
          <button key={key} type="button" style={{ ...buttonStyle(Boolean(activeAccount)), marginLeft: 12, width: "calc(100% - 12px)" }} disabled={Boolean(activeAccount)} onClick={() => void login(key)}>
            {activeAccount === key ? `Đang đăng nhập ${email}…` : email}
          </button>
        )) : null}
      </div>
      {message ? <p role="alert" style={{ margin: "14px 0 0", color: "#a52127", fontSize: 13, lineHeight: 1.45 }}>{message}</p> : null}
    </section>
  );

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7f5f3" }}><div style={{ width: "min(100%, 460px)" }}>{panel}</div></main>;
}
