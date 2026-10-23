import axios from "axios";
import Cookies from "js-cookie";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { authApi } from "@/apis/auth.api";
import { getPostLoginPath } from "@/lib/auth-role";
import landingHeroImage from "@/assets/landing-hero-desktop.jpg";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PATH_HOME } from "@/routes/path";
import {
  LoginMfaRequestSchema,
  LoginMfaRequiredResponseSchema,
  LoginRequestSchema,
  LoginSuccessResponseSchema,
  type TLoginMfaResponse,
} from "@/schema/auth.schema";
import { LOGIN_MESSAGES } from "@/text/auth/login-messages";
import { TYPOGRAPHY_STYLES } from "@/text/typography";

type LoginStep = "credentials" | "mfa";

function getErrorMessage(error: unknown, step: LoginStep): string {
  if (!axios.isAxiosError(error)) return LOGIN_MESSAGES.ERRORS.GENERIC;
  if (error.response?.status === 401) {
    return step === "mfa"
      ? LOGIN_MESSAGES.ERRORS.INVALID_CODE
      : LOGIN_MESSAGES.ERRORS.INVALID_CREDENTIALS;
  }
  if (error.response?.status === 502 || !error.response) {
    return LOGIN_MESSAGES.ERRORS.UNAVAILABLE;
  }
  return LOGIN_MESSAGES.ERRORS.GENERIC;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setErrorMessage("");

    if (step === "credentials") {
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
        const response = await authApi.login(request.data);
        const mfa = LoginMfaRequiredResponseSchema.safeParse(response);
        if (mfa.success) {
          openMfa(mfa.data.temp_token);
        } else {
          completeLogin(LoginSuccessResponseSchema.parse(response));
        }
      } catch (error) {
        const mfa = axios.isAxiosError(error)
          ? LoginMfaRequiredResponseSchema.safeParse(error.response?.data)
          : null;
        if (mfa?.success) {
          openMfa(mfa.data.temp_token);
        } else {
          setErrorMessage(getErrorMessage(error, step));
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const request = LoginMfaRequestSchema.safeParse({ temp_token: tempToken, code });
    if (!request.success) {
      setErrorMessage(LOGIN_MESSAGES.ERRORS.MISSING_CODE);
      return;
    }

    setLoading(true);
    try {
      completeLogin(await authApi.loginMfa(request.data));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, step));
    } finally {
      setLoading(false);
    }
  }

  function returnToCredentials() {
    setStep("credentials");
    setTempToken("");
    setCode("");
    setErrorMessage("");
  }

  const isMfa = step === "mfa";
  const content = isMfa ? LOGIN_MESSAGES.MFA : LOGIN_MESSAGES.FORM;

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
              {isMfa ? <ShieldCheck size={25} /> : <LockKeyhole size={25} />}
            </div>
            <p className="form-eyebrow">{content.EYEBROW}</p>
            <h2 id="login-title">{content.TITLE}</h2>
            <p className="form-description">{content.DESCRIPTION}</p>

            <form onSubmit={handleSubmit} noValidate>
              {isMfa ? (
                <div className="field">
                  <label htmlFor="login-code">{LOGIN_MESSAGES.MFA.CODE_LABEL}</label>
                  <div className="input-wrap">
                    <KeyRound size={19} aria-hidden="true" />
                    <input
                      id="login-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={LOGIN_MESSAGES.MFA.CODE_PLACEHOLDER}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      disabled={loading}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
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

            {isMfa ? (
              <button
                type="button"
                className="secondary-link"
                onClick={returnToCredentials}
                disabled={loading}
              >
                {LOGIN_MESSAGES.MFA.BACK}
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
        .error-message { margin: -4px 0 0; padding: 12px 14px; border-radius: 7px; color: #912c36; background: #fae9e8; font-size: var(--font-size-control); line-height: 1.5; }
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
