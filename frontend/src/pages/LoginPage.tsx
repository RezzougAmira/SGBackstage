import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import imgBg from "../assets/blueSide.png";
import imgIllustration from "../assets/TOUR.png";
import imgLogoBlanc from "../assets/Logo texte blanc SGB Tresor.png";

// Vérification volontairement simple : on ne cherche pas à valider la RFC 5322,
// seulement à attraper les fautes de frappe évidentes avant l'appel réseau.
const MOTIF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ChampInvalide = "email" | "password" | null;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // login: (email: string, password: string) => Promise<void>

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [champInvalide, setChampInvalide] = useState<ChampInvalide>(null);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Le client API signale une session expirée (401) avant de rediriger ici :
  // on affiche la raison au lieu de laisser l'utilisateur devant un formulaire
  // vide sans explication.
  useEffect(() => {
    if (sessionStorage.getItem("session-expiree")) {
      sessionStorage.removeItem("session-expiree");
      setInfo("Votre session a expiré. Merci de vous reconnecter.");
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setChampInvalide(null);

    const emailSaisi = email.trim();

    if (!emailSaisi) {
      setError("Veuillez saisir votre adresse e-mail.");
      setChampInvalide("email");
      emailRef.current?.focus();
      return;
    }
    if (!MOTIF_EMAIL.test(emailSaisi)) {
      setError("Cette adresse e-mail n'est pas valide.");
      setChampInvalide("email");
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      setError("Veuillez saisir votre mot de passe.");
      setChampInvalide("password");
      passwordRef.current?.focus();
      return;
    }

    if (emailSaisi !== email) setEmail(emailSaisi);

    setIsSubmitting(true);
    try {
      await login(emailSaisi, password);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Identifiants incorrects. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const suivreCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  };

  const classesChamp = (champ: Exclude<ChampInvalide, null>) =>
    `login-anim-up flex h-[63px] w-full items-center gap-4 rounded-[50px] border bg-white px-7 transition-[border-color,box-shadow] duration-200 ${
      champ === "email" ? "login-delay-2 mt-8" : "login-delay-3 mt-4"
    } ${
      champInvalide === champ
        ? "border-red-400 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100"
        : "border-[#eee] focus-within:border-[#004B87]/50 focus-within:ring-4 focus-within:ring-[#004B87]/10"
    }`;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8fa]">
      {/* Left diagonal panel — hidden on small screens */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[70%] max-w-[860px] lg:block">
        <img alt="" className="h-full w-full object-cover" src={imgBg} />
        {/* Animation via la propriété `translate` (et non `transform`) pour
            ne pas écraser le -translate-x-1/2 qui centre l'illustration. */}
        <img
          alt=""
          className="login-anim-float absolute bottom-0 left-[36%] h-[88%] w-auto max-h-[740px] -translate-x-1/2 object-contain object-bottom"
          src={imgIllustration}
        />
        <img
          alt="SGB Trésor"
          className="login-anim-left absolute left-[4.5%] top-[4%] w-[20%] max-w-[190px] object-contain"
          src={imgLogoBlanc}
        />
      </div>

      {/* Mobile header with logo — fond bleu car le logo texte est blanc */}
      <div className="login-anim-up relative z-10 flex items-center justify-center pt-8 lg:hidden">
        <div className="rounded-2xl bg-[#004a86] px-4 py-2">
          <img alt="SGB Trésor" className="w-28 object-contain" src={imgLogoBlanc} />
        </div>
      </div>

      {/* Right content — centered on mobile, right-aligned on desktop */}
      <div className="relative z-10 flex min-h-[calc(100vh-6rem)] items-center justify-center px-6 lg:min-h-screen lg:justify-end lg:pr-[16%]">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[calc(100%-2rem)] font-poppins lg:max-w-[321px]"
          noValidate
          aria-busy={isSubmitting}
        >
          <h1 className="login-anim-up whitespace-nowrap text-center text-[calc(1.4rem+0.7vw)] font-bold leading-tight text-[#071c38]">
            Ravi de vous revoir !
          </h1>
          <p className="login-anim-up login-delay-1 mt-1 text-center text-[calc(0.9rem+0.25vw)] text-[#071c38]">Bienvenue sur votre espace</p>

          {info && !error && (
            <p
              role="status"
              className="login-anim-up login-delay-1 mt-4 rounded-[12px] bg-[#e8f1fb] px-4 py-2 text-center text-sm text-[#004B87]"
            >
              {info}
            </p>
          )}

          {error && (
            <p
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="login-anim-shake mt-4 rounded-[12px] bg-red-50 px-4 py-2 text-center text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <div className={classesChamp("email")}>
            <label htmlFor="login-email" className="sr-only">
              Adresse e-mail
            </label>
            <svg className="h-[22px] w-[22px] shrink-0 text-[#B0B0B0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <input
              ref={emailRef}
              id="login-email"
              name="email"
              type="email"
              required
              aria-required="true"
              aria-invalid={champInvalide === "email"}
              aria-describedby={error ? "login-error" : undefined}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setChampInvalide(null);
                setError(null);
              }}
              className="w-full bg-white text-[15px] text-[#333] placeholder:text-[#B0B0B0] focus:outline-none"
            />
          </div>

          <div className={classesChamp("password")}>
            <label htmlFor="login-password" className="sr-only">
              Mot de passe
            </label>
            <svg className="h-[22px] w-[22px] shrink-0 text-[#B0B0B0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <input
              ref={passwordRef}
              id="login-password"
              name="password"
              type={motDePasseVisible ? "text" : "password"}
              required
              aria-required="true"
              aria-invalid={champInvalide === "password"}
              aria-describedby={error ? "login-error" : undefined}
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setChampInvalide(null);
                setError(null);
              }}
              onKeyDown={suivreCapsLock}
              onKeyUp={suivreCapsLock}
              onBlur={() => setCapsLock(false)}
              className="w-full bg-white text-[15px] text-[#333] placeholder:text-[#B0B0B0] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setMotDePasseVisible((v) => !v)}
              aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={motDePasseVisible}
              className="shrink-0 rounded-full p-1 text-[#B0B0B0] transition-colors hover:bg-[#f2f4f7] hover:text-[#004B87] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004B87]/40"
            >
              {motDePasseVisible ? (
                <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>

          {capsLock && (
            <p role="status" className="mt-2 px-3 text-left text-xs font-medium text-amber-600">
              Verrouillage majuscules activé
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="login-anim-up login-delay-4 mt-4 flex h-[60px] w-full items-center justify-center rounded-[50px] bg-[#004B87] text-[15px] text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#003a6b] hover:shadow-lg hover:shadow-[#004B87]/25 active:translate-y-0 active:shadow-none disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
          >
            {isSubmitting && (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
            )}
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
