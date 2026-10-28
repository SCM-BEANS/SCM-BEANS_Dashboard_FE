import axios from "axios";
import Cookies from "js-cookie";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { authApi } from "@/apis/auth.api";
import { LiquidSuccessSplash, prepareLiquidSuccessAnimation } from "@/components/feedback/liquid-success-splash";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getPostLoginPath } from "@/lib/auth-role";
import { PATH_HOME } from "@/routes/path";
import {
  FirstLoginPasswordChangeRequestSchema,
  LoginMfaRequestSchema,
  LoginMfaRequiredResponseSchema,
  LoginPasswordChangeRequiredResponseSchema,
  LoginRequestSchema,
  LoginSuccessResponseSchema,
  VerifyEmailRequestSchema,
  type TLoginMfaResponse,
  type TLoginResponse,
} from "@/schema/auth.schema";
import { LOGIN_MESSAGES } from "@/text/auth/login-messages";

type LoginStep = "credentials" | "mfa" | "email-verification" | "password-change";
type PasswordFieldName = "password" | "newPassword" | "confirmNewPassword";

function isEmailVerificationRequired(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return false;

  const payload = error.response.data;
  if (!payload || typeof payload !== "object") return false;

  const body = payload as Record<string, unknown>;
  const message = [body.error, body.code, body.reason, body.status, body.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return (
    message.includes("email not verified") ||
    message.includes("email is not verified") ||
    message.includes("email verification required") ||
    message.includes("email unverified") ||
    message.includes("unverified email") ||
    message.includes("email chưa xác thực") ||
    message.includes("chưa xác thực email") ||
    message.includes("verification email has been sent")
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [passwordChangeChallenge, setPasswordChangeChallenge] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState<Record<PasswordFieldName, boolean>>({
    password: false,
    newPassword: false,
    confirmNewPassword: false,
  });
  const [loginSuccessDestination, setLoginSuccessDestination] = useState("");

  async function navigateAfterLogin(destination: string) {
    try {
      const navigated = await router.replace(destination);
      if (navigated === false) throw new Error("Navigation cancelled");
    } catch {
      setLoginSuccessDestination("");
      setErrorMessage(LOGIN_MESSAGES.ERRORS.NAVIGATION_FAILED);
    }
  }

  function completeLogin(response: TLoginMfaResponse) {
    Cookies.set("access_token", response.access_token, {
      expires: response.expires_in / 86_400,
      path: "/",
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    });
    const destination = getPostLoginPath(response.access_token);
    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    } catch {
      reducedMotion = false;
    }
    if (reducedMotion) {
      void navigateAfterLogin(destination);
      return;
    }
    setLoginSuccessDestination(destination);
  }

  function openMfa(token: string) {
    setTempToken(token);
    setPassword("");
    setCode("");
    setStep("mfa");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEmailVerification() {
    setCode("");
    setStep("email-verification");
    setErrorMessage("");
    setSuccessMessage(LOGIN_MESSAGES.NOTICES.EMAIL_OTP_SENT);
  }

  function openPasswordChange(challenge: string) {
    setPasswordChangeChallenge(challenge);
    setPassword("");
    setCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setStep("password-change");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleLoginResponse(response: TLoginResponse) {
    const passwordChange = LoginPasswordChangeRequiredResponseSchema.safeParse(response);
    if (passwordChange.success) {
      openPasswordChange(passwordChange.data.challenge);
      return;
    }

    const mfa = LoginMfaRequiredResponseSchema.safeParse(response);
    if (mfa.success) {
      openMfa(mfa.data.temp_token);
      return;
    }

    completeLogin(LoginSuccessResponseSchema.parse(response));
  }

  function handleLoginChallengeError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;

    const passwordChange = LoginPasswordChangeRequiredResponseSchema.safeParse(
      error.response?.data,
    );
    if (passwordChange.success) {
      openPasswordChange(passwordChange.data.challenge);
      return true;
    }

    const mfa = LoginMfaRequiredResponseSchema.safeParse(error.response?.data);
    if (mfa.success) {
      openMfa(mfa.data.temp_token);
      return true;
    }

    return false;
  }

  async function submitCredentials() {
    const request = LoginRequestSchema.safeParse({ email, password });
    if (!request.success) {
      setErrorMessage(
        request.error.issues.some((issue) => issue.path[0] === "email")
          ? LOGIN_MESSAGES.ERRORS.INVALID_EMAIL
          : LOGIN_MESSAGES.ERRORS.MISSING_PASSWORD,
      );
      return;
    }

    setLoading(true);
    try {
      handleLoginResponse(await authApi.login(request.data));
    } catch (error) {
      if (handleLoginChallengeError(error)) return;
      if (isEmailVerificationRequired(error)) {
        openEmailVerification();
        return;
      }
      setErrorMessage(getApiErrorMessage(error, "login"));
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa() {
    const request = LoginMfaRequestSchema.safeParse({ temp_token: tempToken, code });
    if (!request.success) {
      setErrorMessage(LOGIN_MESSAGES.ERRORS.MISSING_CODE);
      return;
    }

    setLoading(true);
    try {
      completeLogin(await authApi.loginMfa(request.data));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "mfa"));
    } finally {
      setLoading(false);
    }
  }

  async function submitEmailVerification() {
    const request = VerifyEmailRequestSchema.safeParse({ email, code });
    if (!request.success) {
      setErrorMessage(LOGIN_MESSAGES.ERRORS.INVALID_EMAIL_OTP);
      return;
    }
    if (!password) {
      setStep("credentials");
      setErrorMessage(LOGIN_MESSAGES.ERRORS.TEMPORARY_PASSWORD_MISSING);
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyEmail(request.data);

      let response: TLoginResponse;
      try {
        response = await authApi.login({ email, password });
      } catch (error) {
        if (handleLoginChallengeError(error)) return;
        setStep("credentials");
        setPassword("");
        setErrorMessage(getApiErrorMessage(error, "login"));
        return;
      }

      const passwordChange = LoginPasswordChangeRequiredResponseSchema.safeParse(response);
      if (!passwordChange.success) {
        setStep("credentials");
        setPassword("");
        setErrorMessage(LOGIN_MESSAGES.ERRORS.PASSWORD_CHANGE_CHALLENGE_MISSING);
        return;
      }

      openPasswordChange(passwordChange.data.challenge);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 400 || error.response?.status === 401)
      ) {
        setErrorMessage(LOGIN_MESSAGES.ERRORS.INVALID_EMAIL_OTP);
      } else {
        setErrorMessage(getApiErrorMessage(error, "login"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitFirstLoginPassword() {
    if (newPassword.length < 8) {
      setErrorMessage(LOGIN_MESSAGES.ERRORS.PASSWORD_TOO_SHORT);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(LOGIN_MESSAGES.ERRORS.PASSWORDS_DO_NOT_MATCH);
      return;
    }

    const request = FirstLoginPasswordChangeRequestSchema.safeParse({
      challenge: passwordChangeChallenge,
      new_password: newPassword,
    });
    if (!request.success) {
      setErrorMessage(LOGIN_MESSAGES.ERRORS.TEMPORARY_PASSWORD_MISSING);
      return;
    }

    setLoading(true);
    let passwordChanged = false;
    try {
      await authApi.changeFirstLoginPassword(request.data);
      passwordChanged = true;

      const response = await authApi.login({ email, password: newPassword });
      handleLoginResponse(response);
    } catch (error) {
      if (passwordChanged) {
        setStep("credentials");
        setPassword(newPassword);
        setPasswordChangeChallenge("");
        setSuccessMessage(LOGIN_MESSAGES.NOTICES.PASSWORD_CHANGED_LOGIN_RETRY);
        setErrorMessage(getApiErrorMessage(error, "login"));
      } else {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 400 || error.response?.status === 401)
        ) {
          setErrorMessage(LOGIN_MESSAGES.ERRORS.PASSWORD_CHANGE_FAILED);
        } else {
          setErrorMessage(getApiErrorMessage(error, "login"));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendEmailVerification() {
    if (loading || loginSuccessDestination) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await authApi.resendEmailVerification({ email });
      setSuccessMessage(LOGIN_MESSAGES.NOTICES.EMAIL_OTP_RESENT);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "login"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || loginSuccessDestination) return;
    setErrorMessage("");
    setSuccessMessage("");

    if (step === "credentials") return submitCredentials();
    if (step === "mfa") return submitMfa();
    if (step === "email-verification") return submitEmailVerification();
    return submitFirstLoginPassword();
  }

  function returnToCredentials() {
    setStep("credentials");
    setTempToken("");
    setCode("");
    setPassword("");
    setPasswordChangeChallenge("");
    setNewPassword("");
    setConfirmNewPassword("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function passwordVisibilityToggle(field: PasswordFieldName, label: string) {
    const visible = passwordVisibility[field];
    return (
      <button
        type="button"
        className="password-toggle"
        aria-label={`${visible ? "Ẩn" : "Hiện"} ${label}`}
        aria-pressed={visible}
        disabled={loading || Boolean(loginSuccessDestination)}
        onClick={() => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    );
  }

  const isMfa = step === "mfa";
  const isEmailVerification = step === "email-verification";
  const isCodeEntry = isMfa || isEmailVerification;
  const content =
    step === "credentials"
      ? LOGIN_MESSAGES.FORM
      : step === "mfa"
        ? LOGIN_MESSAGES.MFA
        : step === "email-verification"
          ? LOGIN_MESSAGES.FIRST_LOGIN_OTP
          : LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD;

  return (
    <>
      <Head>
        <title>{LOGIN_MESSAGES.PAGE.TITLE}</title>
        <meta name="description" content={LOGIN_MESSAGES.PAGE.DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="login-page" inert={Boolean(loginSuccessDestination)}>
        <section className="login-card" aria-labelledby="login-title">
          <Link
            href={PATH_HOME.ROOT}
            className="login-brand"
            aria-label={LOGIN_MESSAGES.BRAND.HOME_LABEL}
          >
            dolores.
          </Link>
          <div className="form-wrap login-content" key={step} data-step={step}>
            <h1 id="login-title">{content.TITLE}</h1>
            <p id="login-description" className="form-description">
              {content.DESCRIPTION}
              {isEmailVerification && <><br /><strong>{email}</strong></>}
            </p>

            <form
              onSubmit={handleSubmit}
              onFocus={() => { void prepareLiquidSuccessAnimation(); }}
              aria-busy={loading}
              aria-describedby="login-description"
              noValidate
            >
              {isCodeEntry ? (
                <div className="field">
                  <label htmlFor="login-code">
                    {isMfa
                      ? LOGIN_MESSAGES.MFA.CODE_LABEL
                      : LOGIN_MESSAGES.FIRST_LOGIN_OTP.CODE_LABEL}
                  </label>
                  <div className="input-wrap">
                    <input
                      id="login-code"
                      className="code-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder={isMfa
                        ? LOGIN_MESSAGES.MFA.CODE_PLACEHOLDER
                        : LOGIN_MESSAGES.FIRST_LOGIN_OTP.CODE_PLACEHOLDER}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={loading || Boolean(loginSuccessDestination)}
                      aria-describedby={errorMessage ? "login-feedback" : undefined}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              ) : step === "credentials" ? (
                <>
                  <div className="field">
                    <label htmlFor="login-email">{LOGIN_MESSAGES.FORM.EMAIL_LABEL}</label>
                    <div className="input-wrap">
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        placeholder={LOGIN_MESSAGES.FORM.EMAIL_PLACEHOLDER}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={loading || Boolean(loginSuccessDestination)}
                        aria-describedby={errorMessage ? "login-feedback" : undefined}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="login-password">
                      {LOGIN_MESSAGES.FORM.PASSWORD_LABEL}
                    </label>
                    <div className="input-wrap">
                      <input
                        id="login-password"
                        type={passwordVisibility.password ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={LOGIN_MESSAGES.FORM.PASSWORD_PLACEHOLDER}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading || Boolean(loginSuccessDestination)}
                        aria-describedby={errorMessage ? "login-feedback" : undefined}
                        required
                      />
                      {passwordVisibilityToggle("password", "mật khẩu")}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="login-new-password">
                      {LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.PASSWORD_LABEL}
                    </label>
                    <div className="input-wrap">
                      <input
                        id="login-new-password"
                        type={passwordVisibility.newPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        placeholder={LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.PASSWORD_PLACEHOLDER}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        disabled={loading || Boolean(loginSuccessDestination)}
                        aria-describedby={errorMessage ? "login-feedback" : "login-password-hint"}
                        required
                        autoFocus
                      />
                      {passwordVisibilityToggle("newPassword", "mật khẩu mới")}
                    </div>
                  </div>
                  <p id="login-password-hint" className="field-hint">{LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.PASSWORD_HINT}</p>
                  <div className="field">
                    <label htmlFor="login-confirm-new-password">
                      {LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.CONFIRM_PASSWORD_LABEL}
                    </label>
                    <div className="input-wrap">
                      <input
                        id="login-confirm-new-password"
                        type={passwordVisibility.confirmNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        placeholder={LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.CONFIRM_PASSWORD_PLACEHOLDER}
                        value={confirmNewPassword}
                        onChange={(event) => setConfirmNewPassword(event.target.value)}
                        disabled={loading || Boolean(loginSuccessDestination)}
                        aria-describedby={errorMessage ? "login-feedback" : undefined}
                        required
                      />
                      {passwordVisibilityToggle("confirmNewPassword", "xác nhận mật khẩu mới")}
                    </div>
                  </div>
                </>
              )}

              {successMessage && (
                <p className="success-message" role="status">
                  {successMessage}
                </p>
              )}

              {errorMessage && (
                <p id="login-feedback" className="error-message" role="alert">
                  {errorMessage}
                </p>
              )}

              <button className="submit-button" type="submit" disabled={loading || Boolean(loginSuccessDestination)}>
                {loading && <span className="submit-spinner" aria-hidden="true" />}
                <span>
                  {loginSuccessDestination ? LOGIN_MESSAGES.FORM.SUCCESS : loading
                    ? content.SUBMITTING
                    : content.SUBMIT}
                </span>
                {!loading && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </form>

            {isEmailVerification && (
              <button
                type="button"
                className="secondary-link"
                onClick={() => void resendEmailVerification()}
                disabled={loading}
              >
                {LOGIN_MESSAGES.FIRST_LOGIN_OTP.RESEND}
              </button>
            )}

            {step !== "credentials" ? (
              <button
                type="button"
                className="secondary-link"
                onClick={returnToCredentials}
                disabled={loading}
              >
                {isMfa
                  ? LOGIN_MESSAGES.MFA.BACK
                  : isEmailVerification
                    ? LOGIN_MESSAGES.FIRST_LOGIN_OTP.BACK
                    : LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.BACK}
              </button>
            ) : null}
          </div>
        </section>
        {step === "credentials" && (
          <Link href={PATH_HOME.ROOT} className="secondary-link home-link">
            <ArrowRight size={16} className="back-arrow" aria-hidden="true" />
            {LOGIN_MESSAGES.FORM.BACK_HOME}
          </Link>
        )}
      </main>

      {loginSuccessDestination && (
        <LiquidSuccessSplash
          onComplete={() => {
            void navigateAfterLogin(loginSuccessDestination);
          }}
        />
      )}

      <style jsx global>{`
        html, body, #__next { min-height: 100%; }
        body { margin: 0; }
        *, *::before, *::after { box-sizing: border-box; }
        .login-page .secondary-link { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; margin: 16px auto 0; padding: 8px 12px; border: 0; border-radius: 8px; color: #675b57; background: transparent; font: inherit; font-size: .875rem; font-weight: 500; text-decoration: none; cursor: pointer; }
        .login-page .home-link { margin: 0 auto; }
        .login-page .back-arrow { transform: rotate(180deg); }
        .login-page .login-brand { display: inline-flex; align-items: center; min-height: 44px; margin: 0 0 24px; border-radius: 4px; color: #b81724; font-size: 2rem; font-weight: 700; letter-spacing: -.045em; line-height: 1; text-decoration: none; }
        .login-page .login-brand:focus-visible { outline: 2px solid #b81724; outline-offset: 4px; }
        .login-page .password-toggle { flex: 0 0 44px; width: 44px; min-width: 44px; height: 44px; min-height: 44px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 8px; color: #675b57; background: transparent; cursor: pointer; }
        .login-page .password-toggle:hover { color: #b81724; background: #f9e9ea; }
        .login-page .password-toggle:focus-visible { outline: 2px solid #b81724; outline-offset: 1px; }
        .login-page .password-toggle:active:not(:disabled) { background: #f1d6d9; }
        .login-page .password-toggle:disabled { cursor: not-allowed; opacity: .6; }
        .login-page .secondary-link:hover { text-decoration: underline; }
        .login-page .secondary-link:active { background: #f1e9e7; }
        .login-page .secondary-link:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>

      <style jsx>{`
        .login-page { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; padding: 32px 16px; color: #302927; background: #f8f6f3; font-family: Arial, Helvetica, sans-serif; }
        .login-card { width: 100%; max-width: 440px; padding: 28px 24px 32px; border: 1px solid #e9e2dc; border-radius: 16px; background: #fff; box-shadow: 0 4px 24px rgba(48, 41, 39, .035); }
        .login-content { animation: login-step-enter 180ms cubic-bezier(.22, 1, .36, 1) both; }
        @keyframes login-step-enter { from { opacity: .7; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .form-wrap { width: 100%; }
        h1 { margin: 0 0 8px; color: #302927; font-size: 1.75rem; font-weight: 700; line-height: 1.25; letter-spacing: -.025em; text-wrap: balance; }
        .form-description { margin: 0 0 28px; color: #675b57; font-size: 1rem; line-height: 1.5; overflow-wrap: anywhere; }
        form { display: grid; gap: 20px; }
        .field { display: grid; gap: 8px; }
        label { color: #302927; font-size: .875rem; font-weight: 600; }
        .input-wrap { min-height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 4px 0 16px; border: 1px solid #968781; border-radius: 10px; color: #675b57; background: #fff; transition: border-color 160ms ease, box-shadow 160ms ease; }
        .input-wrap:hover { border-color: #887b75; }
        .input-wrap:focus-within { border-color: #b81724; box-shadow: 0 0 0 3px #f1d6d9; }
        .input-wrap:has(input:disabled) { background: #f8f6f3; border-color: #d8cfca; }
        input { min-width: 0; width: 100%; min-height: 50px; padding: 0; border: 0; border-radius: 8px; outline: 0; color: #302927; background: transparent; font: inherit; font-size: 1rem; }
        input::placeholder { color: #766a65; opacity: 1; }
        input:focus-visible { outline: 2px solid #b81724; outline-offset: -3px; }
        .code-input { text-align: center; letter-spacing: .35em; font-variant-numeric: tabular-nums; }
        .code-input::placeholder { letter-spacing: normal; }
        .field-hint { margin: -12px 0 0; color: #675b57; font-size: .875rem; line-height: 1.5; }
        input:disabled { cursor: not-allowed; }
        .error-message, .success-message { margin: 0; padding: 12px 16px; border-radius: 8px; font-size: .875rem; line-height: 1.5; overflow-wrap: anywhere; }
        .error-message { color: #a82920; background: #fcecea; }
        .success-message { color: #24653c; background: #e8f5eb; }
        .submit-button { min-height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 12px; margin-top: 4px; padding: 12px 16px; border: 0; border-radius: 10px; color: #fff; background: #b81724; font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 160ms ease, transform 160ms ease; }
        .submit-button:hover:not(:disabled) { background: #99131d; }
        .submit-button:active:not(:disabled) { transform: scale(.99); background: #85111b; }
        .submit-button:disabled { background: #986168; cursor: wait; }
        .submit-button:focus-visible, .secondary-link:focus-visible { outline: 2px solid #b81724; outline-offset: 3px; }
        .submit-spinner { width: 16px; height: 16px; border: 2px solid rgb(255 255 255 / 45%); border-top-color: #fff; border-radius: 50%; animation: login-spin 700ms linear infinite; }
        @keyframes login-spin { to { transform: rotate(360deg); } }
        @media (min-width: 640px) {
          .login-card { padding: 32px 36px 36px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-content, .submit-spinner { animation: none; }
          .login-page * { transition-duration: 0ms !important; }
          .submit-button:active:not(:disabled) { transform: none; }
        }
      `}</style>
    </>
  );
}
