// Lucian UX/UI Prompt #244 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#244
import axios from "axios";
import Cookies from "js-cookie";
import { Eye, EyeOff } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
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

type LoginValues = { email: string; password: string; code: string; newPassword: string; confirmNewPassword: string };
type FieldErrors = Record<string, string>;

export function getLoginFieldErrors(step: LoginStep, values: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  if (step === "credentials") {
    const request = LoginRequestSchema.safeParse({ email: values.email, password: values.password });
    if (!request.success) for (const issue of request.error.issues) {
      const field = String(issue.path[0]);
      errors[`login-${field}`] = field === "email" ? LOGIN_MESSAGES.ERRORS.INVALID_EMAIL : LOGIN_MESSAGES.ERRORS.MISSING_PASSWORD;
    }
  } else if (step === "password-change") {
    if (values.newPassword.length < 8) errors["login-new-password"] = LOGIN_MESSAGES.ERRORS.PASSWORD_TOO_SHORT;
    else if (values.newPassword.length > 72) errors["login-new-password"] = "Mật khẩu không được vượt quá 72 ký tự.";
    if (!values.confirmNewPassword || values.newPassword !== values.confirmNewPassword) errors["login-confirm-new-password"] = LOGIN_MESSAGES.ERRORS.PASSWORDS_DO_NOT_MATCH;
  } else if (step === "email-verification" ? !/^\d{6}$/.test(values.code) : !values.code.trim()) {
    errors["login-code"] = step === "email-verification" ? LOGIN_MESSAGES.ERRORS.INVALID_EMAIL_OTP : LOGIN_MESSAGES.ERRORS.MISSING_CODE;
  }
  return errors;
}

function focusLoginField(id: string) {
  const field = document.getElementById(id);
  if (!field) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  field.focus({ preventScroll: true });
  field.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
}

function LoginValidationSummary({ errors }: { errors: FieldErrors }) {
  const entries = Object.entries(errors);
  return <div className="validation-summary" data-open={entries.length > 0}>
    <div><div className="validation-summary-body" role="alert" aria-atomic="true">
      {entries.length > 0 && <><strong>{entries.length} mục cần kiểm tra</strong><ul>
        {entries.map(([id, message]) => <li key={id}><a href={`#${id}`} onClick={(event) => { event.preventDefault(); focusLoginField(id); }}>{message}</a></li>)}
      </ul></>}
    </div></div>
  </div>;
}

// Reuse the landing renderer in an isolated document; unloading the iframe releases its WebGL context.
const LOGIN_MODEL_DOCUMENT = `<!doctype html><html lang="vi"><head><base href="/"><style>
:root{color-scheme:light}html,body{margin:0;height:100%;background:transparent;overflow:hidden}#model{height:100%;width:100%;position:relative}canvas{display:block}.viewer-status{display:none;position:absolute;bottom:8px;width:100%;text-align:center;font:13px Arial;color:#675b57}.viewer-status.load-error{display:block}.viewer-status[hidden]{display:none}
</style><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script></head><body><div id="model"></div><script type="module">
try {
  const { createViewer } = await import('/landing/viewer.js');
  const annotations = { sync(){}, render(){}, pickable(){return []}, pick(){}, setMarkers(){} };
  const viewer = createViewer(annotations, { flows:[], stepFlows:{} }, { channels:[] }, { includeBoards:false });
  viewer.registerHost('login', document.getElementById('model'), { modelId:'body', autoRotate:false, zoom:false, lighting:'studio', view:{az:35,el:18}, shellMode:'show', explode:0 });
  const model = await viewer.load('body');
  const shadow = model.holder.getObjectByName('studio-soft-shadow');
  if (shadow) shadow.visible = false;
  const pose = viewer.shotPose({az:35,el:18,fit:true,padding:.85});
  if (pose) viewer.setCamera('login', pose.position, pose.target);
} catch { document.getElementById('model').textContent = ''; }
</script></body></html>`;

function LoginHero() {
  const [showModel, setShowModel] = useState(false);
  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 900px)");
    const update = () => setShowModel(viewport.matches);
    update();
    viewport.addEventListener("change", update);
    return () => viewport.removeEventListener("change", update);
  }, []);
  return <div className="login-illustration" aria-hidden="true">
    <div className="dashboard-preview">
      <div className="preview-sidebar"><b>dolores.</b>{["Tổng quan", "Hợp đồng", "Máy pha", "Hóa đơn", "Hỗ trợ"].map(label => <span key={label}>{label}</span>)}</div>
      <div className="preview-main"><strong>Tổng quan vận hành</strong><div className="preview-cards"><i /><i /><i /></div>
        <div className="preview-chart">{[38, 58, 44, 78, 66, 88, 72].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        <div className="preview-rows"><i /><i /><i /></div>
      </div>
    </div>
    {showModel && <iframe title="Mô hình máy pha Dolores" className="login-model" srcDoc={LOGIN_MODEL_DOCUMENT} tabIndex={-1} />}
  </div>;
}

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
  const [validatedStep, setValidatedStep] = useState<LoginStep | null>(null);
  const [validationRound, setValidationRound] = useState(0);
  const fieldErrors = validatedStep === step ? getLoginFieldErrors(step, { email, password, code, newPassword, confirmNewPassword }) : {};

  function fieldState(id: string, value: string) {
    return {
      "data-invalid": Boolean(fieldErrors[id]),
      "data-valid": validatedStep === step && !fieldErrors[id] && value.length > 0,
      style: fieldErrors[id] ? { animationName: `login-field-shake-${validationRound % 2}` } : undefined,
    };
  }

  function fieldHint(id: string) {
    return <div className="validation-hint" data-open={Boolean(fieldErrors[id])}><div><span id={`${id}-error`}>{fieldErrors[id]}</span></div></div>;
  }

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

    const errors = getLoginFieldErrors(step, { email, password, code, newPassword, confirmNewPassword });
    setValidatedStep(step);
    setValidationRound((round) => round + 1);
    if (Object.keys(errors).length) {
      focusLoginField(Object.keys(errors)[0]);
      return;
    }

    if (step === "credentials") return submitCredentials();
    if (step === "mfa") return submitMfa();
    if (step === "email-verification") return submitEmailVerification();
    return submitFirstLoginPassword();
  }

  function returnToCredentials() {
    setValidatedStep(null);
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
        <header className="login-header">
          <Link href={PATH_HOME.ROOT} className="login-brand" aria-label={LOGIN_MESSAGES.BRAND.HOME_LABEL}>dolores.</Link>
          <a className="login-help" href={`mailto:${LOGIN_MESSAGES.BRAND.CONTACT_EMAIL}`}>{LOGIN_MESSAGES.FORM.SUPPORT}</a>
        </header>
        <div className="login-shell">
        <aside className="login-aside" aria-label="Dolores Coffee">
          <h2>{LOGIN_MESSAGES.INTRO.TITLE}<br /><span>{LOGIN_MESSAGES.INTRO.HIGHLIGHT}</span></h2>
          <p>{LOGIN_MESSAGES.INTRO.DESCRIPTION}</p>
          <LoginHero />
        </aside>
        <section className="login-card" aria-labelledby="login-title">
          <div className="form-wrap login-content" key={step} data-step={step}>
            <h1 id="login-title">{content.TITLE}</h1>
            <p id="login-description" className="form-description" hidden={step === "credentials"}>
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
              <LoginValidationSummary errors={fieldErrors} />
              {isCodeEntry ? (
                <div className="field" {...fieldState("login-code", code)}>
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
                      aria-invalid={Boolean(fieldErrors["login-code"])}
                      aria-describedby={fieldErrors["login-code"] ? "login-code-error" : errorMessage ? "login-feedback" : undefined}
                      required
                      autoFocus
                    />
                  </div>
                  {fieldHint("login-code")}
                </div>
              ) : step === "credentials" ? (
                <>
                  <div className="field" {...fieldState("login-email", email)}>
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
                        aria-invalid={Boolean(fieldErrors["login-email"])}
                        aria-describedby={fieldErrors["login-email"] ? "login-email-error" : errorMessage ? "login-feedback" : undefined}
                        required
                        autoFocus
                      />
                    </div>
                    {fieldHint("login-email")}
                  </div>
                  <div className="field" {...fieldState("login-password", password)}>
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
                        aria-invalid={Boolean(fieldErrors["login-password"])}
                        aria-describedby={fieldErrors["login-password"] ? "login-password-error" : errorMessage ? "login-feedback" : undefined}
                        required
                      />
                      {passwordVisibilityToggle("password", "mật khẩu")}
                    </div>
                    {fieldHint("login-password")}
                  </div>
                </>
              ) : (
                <>
                  <div className="field" {...fieldState("login-new-password", newPassword)}>
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
                        aria-invalid={Boolean(fieldErrors["login-new-password"])}
                        aria-describedby={fieldErrors["login-new-password"] ? "login-new-password-error" : errorMessage ? "login-feedback" : "login-password-hint"}
                        required
                        autoFocus
                      />
                      {passwordVisibilityToggle("newPassword", "mật khẩu mới")}
                    </div>
                    {fieldHint("login-new-password")}
                  </div>
                  <p id="login-password-hint" className="field-hint">{LOGIN_MESSAGES.FIRST_LOGIN_PASSWORD.PASSWORD_HINT}</p>
                  <div className="field" {...fieldState("login-confirm-new-password", confirmNewPassword)}>
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
                        aria-invalid={Boolean(fieldErrors["login-confirm-new-password"])}
                        aria-describedby={fieldErrors["login-confirm-new-password"] ? "login-confirm-new-password-error" : errorMessage ? "login-feedback" : undefined}
                        required
                      />
                      {passwordVisibilityToggle("confirmNewPassword", "xác nhận mật khẩu mới")}
                    </div>
                    {fieldHint("login-confirm-new-password")}
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
            {step === "credentials" && (
          <Link href={PATH_HOME.ROOT} className="secondary-link home-link">
            {LOGIN_MESSAGES.FORM.BACK_HOME}
          </Link>
        )}
          </div>
        </section>
        </div>
        <footer className="login-footer">© Dolores Coffee</footer>
      </main>

      {loginSuccessDestination && (
        <LiquidSuccessSplash
          onComplete={() => {
            void navigateAfterLogin(loginSuccessDestination);
          }}
        />
      )}


      <style jsx global>{`
        .login-page { position:absolute; inset:0; --login-page:#fff; --login-surface:#fff; --login-ink:#302927; --login-muted:#675b57; --login-line:#968781; --login-card-line:#ece4de; --login-primary:#b81724; --login-soft:#f9e9ea; --login-error:#a82920; --login-error-bg:#fcecea; --login-success:#24653c; --login-success-bg:#e8f5eb; color-scheme:light; min-height:100vh; min-height:100svh; display:flex; flex-direction:column; padding:24px clamp(24px,4.5vw,80px) 20px; color:var(--login-ink); background:var(--login-page); font-family:Arial,Helvetica,sans-serif; }
        .login-page, .login-page * { box-sizing:border-box; }
        .login-page .login-header, .login-page .login-footer, .login-page .login-shell { width:100%; max-width:1440px; margin-inline:auto; }
        .login-page .login-header { display:flex; align-items:center; justify-content:space-between; min-height:48px; }
        .login-page .login-help { display:inline-flex; align-items:center; min-height:44px; padding:8px; color:var(--login-ink); font-size:.9375rem; text-decoration:none; }
        .login-page .login-help:hover { text-decoration:underline; }
        .login-page .login-brand { display:inline-flex; align-items:center; min-height:44px; color:var(--login-primary); font-size:2.5rem; font-weight:700; letter-spacing:-.055em; text-decoration:none; }
        .login-page .login-shell { flex:1; display:grid; grid-template-columns:minmax(0,1.2fr) minmax(360px,.85fr); align-items:center; gap:clamp(40px,6vw,100px); padding:28px 0; }
        .login-page .login-aside { min-width:0; }
        .login-page .login-aside h2 { margin:0; font-size:clamp(2rem,3vw,3.5rem); line-height:1.15; letter-spacing:-.04em; font-weight:700; }
        .login-page .login-aside h2 span { color:var(--login-primary); }
        .login-page .login-aside > p { margin:22px 0 0; max-width:55ch; color:var(--login-muted); font-size:clamp(1rem,1.2vw,1.125rem); line-height:1.65; }
        .login-page .login-illustration { position:relative; height:clamp(320px,44vh,520px); margin-top:34px; isolation:isolate; pointer-events:none; }
        .login-page .login-model { position:absolute; z-index:1; inset:0; width:100%; height:100%; border:0; background:transparent; }
        .login-page .dashboard-preview { position:absolute; inset:8% 5% 24% 0; display:grid; grid-template-columns:25% 1fr; border:1px solid #e5dfda; border-radius:14px; background:var(--login-surface); box-shadow:0 12px 28px #30292712; overflow:hidden; filter:blur(4px); opacity:.5; user-select:none; }
        .login-page .preview-sidebar { display:flex; flex-direction:column; gap:16px; padding:18px 14px; border-right:1px solid #e5dfda; font-size:11px; }
        .login-page .preview-sidebar b { color:var(--login-primary); font-size:20px; }
        .login-page .preview-sidebar span:first-of-type { color:var(--login-primary); background:var(--login-soft); border-radius:6px; padding:7px; }
        .login-page .preview-main { display:flex; flex-direction:column; gap:14px; padding:20px; font-size:12px; }
        .login-page .preview-cards { display:flex; gap:10px; }
        .login-page .preview-cards i { height:32px; flex:1; border:1px solid var(--login-line); border-radius:5px; }
        .login-page .preview-chart { display:flex; align-items:flex-end; justify-content:space-around; gap:10px; height:110px; border-bottom:1px solid var(--login-line); }
        .login-page .preview-chart i { flex:1; background:#b8172430; border-radius:3px 3px 0 0; }
        .login-page .preview-rows { display:grid; gap:12px; }
        .login-page .preview-rows i { height:7px; background:var(--login-soft); border-radius:3px; }
        .login-page .login-card { min-width:0; width:100%; max-width:460px; justify-self:center; padding:clamp(28px,3vw,44px); border:1px solid var(--login-card-line); border-radius:22px; background:var(--login-surface); box-shadow:0 12px 36px #30292708; }
        .login-page .login-content { animation:login-step-enter 180ms cubic-bezier(.22,1,.36,1) both; }
        .login-page h1 { margin:0 0 8px; color:var(--login-ink); font-size:clamp(1.75rem,2.5vw,2.75rem); font-weight:700; line-height:1.25; letter-spacing:-.025em; }
        .login-page .form-description { margin:12px 0 22px; color:var(--login-muted); font-size:1rem; line-height:1.5; overflow-wrap:anywhere; }
        .login-page [hidden] { display:none !important; }
        .login-page form { display:flex; flex-direction:column; }
        .login-page .field { display:grid; gap:8px; margin-top:22px; }
        .login-page label { display:flex; align-items:center; justify-content:space-between; gap:8px; color:var(--login-ink); font-size:.9375rem; font-weight:600; }
        .login-page .field label::after { content:""; width:6px; height:11px; border:solid var(--login-success); border-width:0 2px 2px 0; opacity:0; transform:rotate(45deg) scale(0); transition:opacity .2s,transform .35s cubic-bezier(.3,1.7,.5,1); }
        .login-page .field[data-valid="true"] label::after { opacity:1; transform:rotate(45deg) scale(1); }
        .login-page .input-wrap { min-height:52px; display:flex; align-items:center; gap:8px; padding:0 4px 0 16px; border:1px solid var(--login-line); border-radius:10px; color:var(--login-muted); background:var(--login-surface); transition:border-color .2s,box-shadow .2s; }
        .login-page .input-wrap:hover { border-color:var(--login-muted); }
        .login-page .input-wrap:focus-within { border-color:var(--login-primary); box-shadow:0 0 0 3px var(--login-soft); }
        .login-page .field[data-invalid="true"] .input-wrap { border-color:var(--login-error); box-shadow:0 0 0 1px var(--login-error); animation-name:inherit; animation-duration:.4s; }
        .login-page .field[data-valid="true"] .input-wrap { border-color:var(--login-success); }
        .login-page input { min-width:0; width:100%; min-height:50px; padding:0; border:0; border-radius:8px; outline:0; color:var(--login-ink); background:transparent; font:inherit; font-size:1rem; }
        .login-page input::placeholder { color:var(--login-muted); opacity:1; }
        .login-page input:-webkit-autofill { -webkit-box-shadow:0 0 0 100px var(--login-surface) inset; -webkit-text-fill-color:var(--login-ink); }
        .login-page .input-wrap:has(input:disabled) { opacity:.65; }
        .login-page input:disabled { cursor:not-allowed; }
        .login-page .code-input { text-align:center; letter-spacing:.35em; font-variant-numeric:tabular-nums; }
        .login-page .code-input::placeholder { letter-spacing:normal; }
        .login-page .password-toggle { flex:0 0 44px; width:44px; min-width:44px; height:44px; min-height:44px; display:grid; place-items:center; padding:0; border:0; border-radius:8px; color:var(--login-muted); background:transparent; cursor:pointer; }
        .login-page .password-toggle:hover { color:var(--login-primary); background:var(--login-soft); }
        .login-page .password-toggle:disabled { cursor:not-allowed; opacity:.6; }
        .login-page .validation-summary { display:grid; grid-template-rows:0fr; margin-top:0; transition:grid-template-rows .4s cubic-bezier(.3,1,.4,1),margin .4s; }
        .login-page .validation-summary > div { min-height:0; overflow:hidden; }
        .login-page .validation-summary[data-open="true"] { grid-template-rows:1fr; margin-top:20px; }
        .login-page .validation-summary-body { padding:12px 14px; border:1px solid var(--login-error); border-radius:10px; color:var(--login-error); background:var(--login-error-bg); font-size:.875rem; line-height:1.5; }
        .login-page .validation-summary ul { margin:6px 0 0; padding-left:20px; }
        .login-page .validation-summary a { display:inline-flex; align-items:center; min-height:32px; color:inherit; text-underline-offset:3px; }
        .login-page .validation-hint { display:grid; grid-template-rows:0fr; transition:grid-template-rows .3s cubic-bezier(.3,1,.4,1); }
        .login-page .validation-hint[data-open="true"] { grid-template-rows:1fr; }
        .login-page .validation-hint > div { min-height:0; overflow:hidden; }
        .login-page .validation-hint span { display:block; color:var(--login-error); font-size:.875rem; line-height:1.5; }
        .login-page .field-hint { margin:8px 0 0; color:var(--login-muted); font-size:.875rem; line-height:1.5; }
        .login-page .error-message, .login-page .success-message { margin:16px 0 0; padding:12px 16px; border-radius:8px; font-size:.875rem; line-height:1.5; overflow-wrap:anywhere; }
        .login-page .error-message { color:var(--login-error); background:var(--login-error-bg); }
        .login-page .success-message { color:var(--login-success); background:var(--login-success-bg); }
        .login-page .submit-button { min-height:52px; display:inline-flex; align-items:center; justify-content:center; gap:12px; width:100%; margin-top:30px; padding:12px 16px; border:0; border-radius:10px; color:#fff; background:var(--login-primary); font:inherit; font-size:1rem; font-weight:600; cursor:pointer; box-shadow:inset 0 1px 0 #ffffff20,0 4px 10px #b8172412; transition:background .2s,transform .2s; }
        .login-page .submit-button:hover:not(:disabled) { background:#99131d; }
        .login-page .submit-button:active:not(:disabled) { transform:scale(.99); background:#85111b; }
        .login-page .submit-button:disabled { opacity:.6; cursor:wait; }
        .login-page .submit-spinner { width:16px; height:16px; border:2px solid #ffffff73; border-top-color:#fff; border-radius:50%; animation:login-spin 700ms linear infinite; }
        .login-page .secondary-link { display:flex; align-items:center; justify-content:center; min-height:44px; margin:16px auto 0; padding:8px 12px; border:0; border-radius:8px; color:var(--login-muted); background:transparent; font:inherit; font-size:.875rem; text-decoration:none; cursor:pointer; }
        .login-page .secondary-link:hover { text-decoration:underline; }
        .login-page .secondary-link:active { background:var(--login-soft); }
        .login-page .secondary-link:disabled { opacity:.55; cursor:not-allowed; }
        .login-page :is(button,a):focus-visible { outline:2px solid var(--login-primary); outline-offset:3px; }
        .login-page .login-footer { color:var(--login-muted); font-size:.8125rem; }
        @keyframes login-step-enter { from { opacity:.7; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes login-spin { to { transform:rotate(360deg); } }
        @keyframes login-field-shake-0 { 20%,60% { transform:translateX(-5px); } 40%,80% { transform:translateX(5px); } }
        @keyframes login-field-shake-1 { 20%,60% { transform:translateX(-5px); } 40%,80% { transform:translateX(5px); } }
        @media (max-width:899px) {
          .login-page .login-shell { grid-template-columns:1fr; gap:28px; }
          .login-page .login-aside { text-align:center; }
          .login-page .login-aside > p { margin-inline:auto; }
          .login-page .login-illustration { display:none; }
          .login-page .login-card { max-width:440px; }
        }
        @media (max-width:599px) {
          .login-page { padding:20px 18px; }
          .login-page .login-aside { display:none; }
          .login-page .login-shell { padding:28px 0; }
          .login-page .login-card { padding:28px 22px; border-radius:18px; }
          .login-page .login-brand { font-size:2rem; }
        }
        @media (prefers-reduced-motion:reduce) {
          .login-page *, .login-page *::before, .login-page *::after { animation:none !important; transition-duration:0ms !important; scroll-behavior:auto !important; }
          .login-page .submit-button:active:not(:disabled) { transform:none; }
        }
      `}</style>
    </>
  );
}
