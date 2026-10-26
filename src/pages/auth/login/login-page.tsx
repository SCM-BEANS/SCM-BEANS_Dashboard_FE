import axios from "axios";
import Cookies from "js-cookie";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { authApi } from "@/apis/auth.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getPostLoginPath } from "@/lib/auth-role";
import landingHeroImage from "@/assets/landing-hero-desktop.jpg";
import { BrandLogo } from "@/components/brand/brand-logo";
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
import { TYPOGRAPHY_STYLES } from "@/text/typography";

type LoginStep = "credentials" | "mfa" | "email-verification" | "password-change";

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

  function completeLogin(response: TLoginMfaResponse) {
    Cookies.set("access_token", response.access_token, {
      expires: response.expires_in / 86_400,
      path: "/",
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    });
    void router.replace(getPostLoginPath(response.access_token));
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
    if (loading) return;
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
    if (loading) return;
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

      <main className="login-page">
        <aside
          className="story-panel"
          style={{ backgroundImage: `url(${landingHeroImage.src})` }}
        >
          <div className="story-overlay" />
          <div className="story-content">
            <BrandLogo
              href={PATH_HOME.ROOT}
              priority
              ariaLabel={LOGIN_MESSAGES.BRAND.HOME_LABEL}
              brandName={LOGIN_MESSAGES.BRAND.NAME}
              brandTagline={LOGIN_MESSAGES.BRAND.TAGLINE}
            />
            <div className="story-copy">
              <p className="eyebrow">{LOGIN_MESSAGES.INTRO.EYEBROW}</p>
              <h1>{LOGIN_MESSAGES.INTRO.TITLE}</h1>
              <p>{LOGIN_MESSAGES.INTRO.DESCRIPTION}</p>
            </div>
          </div>
        </aside>

        <section className="form-panel" aria-labelledby="login-title">
          <div className="mobile-brand">
            <BrandLogo
              href={PATH_HOME.ROOT}
              ariaLabel={LOGIN_MESSAGES.BRAND.HOME_LABEL}
              brandName={LOGIN_MESSAGES.BRAND.NAME}
              brandTagline={LOGIN_MESSAGES.BRAND.TAGLINE}
            />
          </div>

          <div className="form-wrap">
            <div className="form-icon" aria-hidden="true">
              {isCodeEntry ? <ShieldCheck size={25} /> : <LockKeyhole size={25} />}
            </div>
            <p className="form-eyebrow">{content.EYEBROW}</p>
            <h2 id="login-title">{content.TITLE}</h2>
            <p className="form-description">
              {content.DESCRIPTION}
              {isEmailVerification && <><br /><strong>{email}</strong></>}
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {isCodeEntry ? (
                <div className="field">
                  <label htmlFor="login-code">
                    {isMfa
                      ? LOGIN_MESSAGES.MFA.CODE_LABEL
                      : LOGIN_MESSAGES.FIRST_LOGIN_OTP.CODE_LABEL}
                  </label>
                  <div className="input-wrap">
                    <KeyRound size={19} aria-hidden="true" />
                    <input
                      id="login-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder={isMfa
                        ? LOGIN_MESSAGES.MFA.CODE_PLACEHOLDER
                        : LOGIN_MESSAGES.FIRST_LOGIN_OTP.CODE_PLACEHOLDER}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={loading}
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
                      <Mail size={19} aria-hidden="true" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        placeholder={LOGIN_MESSAGES.FORM.EMAIL_PLACEHOLDER}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={loading}
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
                      <LockKeyhole size={19} aria-hidden="true" />
                      <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder={LOGIN_MESSAGES.FORM.PASSWORD_PLACEHOLDER}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        required
                      />
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
                      <LockKeyhole size={19} aria-hidden="true" />
                      <input
                        id="login-new-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        placeholder={LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.PASSWORD_PLACEHOLDER}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="login-confirm-new-password">
                      {LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.CONFIRM_PASSWORD_LABEL}
                    </label>
                    <div className="input-wrap">
                      <LockKeyhole size={19} aria-hidden="true" />
                      <input
                        id="login-confirm-new-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        placeholder={LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.CONFIRM_PASSWORD_PLACEHOLDER}
                        value={confirmNewPassword}
                        onChange={(event) => setConfirmNewPassword(event.target.value)}
                        disabled={loading}
                        required
                      />
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
                <p className="error-message" role="alert">
                  {errorMessage}
                </p>
              )}

              <button className="submit-button" type="submit" disabled={loading}>
                <span>
                  {loading
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
            ) : (
              <Link href={PATH_HOME.ROOT} className="secondary-link">
                {LOGIN_MESSAGES.FORM.BACK_HOME}
              </Link>
            )}
          </div>
        </section>
      </main>

      <style jsx global>{`
        ${TYPOGRAPHY_STYLES}
        html, body, #__next { min-height: 100%; }
        body { margin: 0; font-family: var(--font-family-body); }
        *, *::before, *::after { box-sizing: border-box; }
        .login-page .brand { display: inline-flex; align-items: center; gap: 11px; color: #fff; text-decoration: none; }
        .login-page .brand-mark { width: 46px; height: 46px; object-fit: contain; }
        .login-page .brand-name { display: flex; flex-direction: column; line-height: 1; letter-spacing: .17em; }
        .login-page .brand-name strong { font-size: var(--font-size-brand); }
        .login-page .brand-name span { margin-top: 4px; font-size: var(--font-size-brand-tagline); }
        .login-page .mobile-brand .brand { color: #6e2028; }
        .login-page .secondary-link { display: table; margin: 25px auto 0; padding: 4px; border: 0; color: #7a3038; background: transparent; font: inherit; font-size: var(--font-size-control); font-weight: 700; text-decoration: none; cursor: pointer; }
        .login-page .secondary-link:hover { text-decoration: underline; }
        .login-page .secondary-link:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>

      <style jsx>{`
        .login-page { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(440px, 48%); background: #fffaf7; }
        .story-panel { position: relative; min-height: 100vh; color: #fff; background-color: #3d1119; background-position: center; background-size: cover; }
        .story-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28, 7, 10, .56), rgba(54, 13, 18, .72)); }
        .story-content { position: relative; min-height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: clamp(30px, 5vw, 72px); }
        .story-copy { max-width: 590px; padding-bottom: 7vh; }
        .eyebrow, .form-eyebrow { margin: 0; font-size: var(--font-size-small); font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
        .eyebrow { color: #f6c9a1; }
        .story-copy h1 { margin: 20px 0; font-family: var(--font-family-display); font-size: clamp(42px, 5vw, 68px); font-weight: 500; line-height: 1.08; }
        .story-copy > p:last-child { max-width: 420px; margin: 0; color: #f4e8e1; font-size: var(--font-size-body-large); line-height: 1.7; }
        .form-panel { display: flex; align-items: center; justify-content: center; padding: 64px clamp(28px, 6vw, 90px); }
        .mobile-brand { display: none; }
        .form-wrap { width: min(100%, 440px); }
        .form-icon { width: 54px; height: 54px; display: grid; place-items: center; margin-bottom: 28px; border-radius: 16px; color: #802e36; background: #f5e6df; }
        .form-eyebrow { color: #9b5d51; }
        h2 { margin: 12px 0 10px; color: #2d171a; font-family: var(--font-family-display); font-size: clamp(36px, 4vw, 48px); font-weight: 500; }
        .form-description { margin: 0 0 38px; color: #79696b; font-size: var(--font-size-body); line-height: 1.6; }
        form { display: grid; gap: 22px; }
        .field { display: grid; gap: 10px; }
        label { color: #39262a; font-size: var(--font-size-control); font-weight: 700; }
        .input-wrap { height: 54px; display: flex; align-items: center; gap: 12px; padding: 0 16px; border: 1px solid #dacbcb; border-radius: 8px; color: #8b7677; background: #fff; transition: border-color .2s ease, box-shadow .2s ease; }
        .input-wrap:focus-within { border-color: #8b3038; box-shadow: 0 0 0 3px rgba(139, 48, 56, .12); }
        input { min-width: 0; width: 100%; border: 0; outline: 0; color: #2d171a; background: transparent; font: inherit; font-size: var(--font-size-body-small); }
        input::placeholder { color: #a49596; }
        input:disabled { cursor: not-allowed; }
        .error-message, .success-message { margin: -4px 0 0; padding: 12px 14px; border-radius: 7px; font-size: var(--font-size-control); line-height: 1.5; }
        .error-message { color: #912c36; background: #fae9e8; }
        .success-message { color: #24653c; background: #e8f5eb; }
        .submit-button { min-height: 54px; display: inline-flex; align-items: center; justify-content: center; gap: 12px; margin-top: 6px; border: 0; border-radius: 8px; color: #fff; background: #721c24; font: inherit; font-size: var(--font-size-body-small); font-weight: 700; cursor: pointer; transition: background .2s ease, transform .2s ease; }
        .submit-button:hover:not(:disabled) { background: #59151d; transform: translateY(-1px); }
        .submit-button:disabled { opacity: .65; cursor: wait; }
        .submit-button:focus-visible, .secondary-link:focus-visible { outline: 3px solid #ca8b6c; outline-offset: 3px; }
        @media (max-width: 900px) {
          .login-page { display: block; min-height: 100vh; }
          .story-panel { display: none; }
          .form-panel { display: block; min-height: 100vh; padding: 28px 24px 64px; }
          .mobile-brand { display: block; margin-bottom: clamp(70px, 12vh, 125px); }
          .form-wrap { margin: 0 auto; }
        }
      `}</style>
    </>
  );
}
