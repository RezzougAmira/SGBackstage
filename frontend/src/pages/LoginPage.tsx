import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import imgBg from "../assets/blueSide.png";
import imgIllustration from "../assets/TOUR.png";
import imgLogo from "../assets/logoAGB.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // login: (email: string, password: string) => Promise<void>

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Identifiants incorrects. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f6f8fa]">
      {/* Left diagonal panel — hidden on small screens */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[70%] max-w-[860px] lg:block">
        <img alt="" className="h-full w-full object-cover" src={imgBg} />
        <img
          alt=""
          className="absolute bottom-0 left-[36%] h-[88%] w-auto max-h-[740px] -translate-x-1/2 object-contain object-bottom"
          src={imgIllustration}
        />
        <img alt="AGBackstage" className="absolute left-[4.5%] top-[4%] w-[10%]" src={imgLogo} />
      </div>

      {/* Mobile header with logo */}
      <div className="relative z-10 flex items-center justify-center pt-8 lg:hidden">
        <img alt="AGBackstage" className="w-12" src={imgLogo} />
      </div>

      {/* Right content — centered on mobile, right-aligned on desktop */}
<div className="relative z-10 flex min-h-[calc(100vh-6rem)] items-center justify-center px-6 lg:min-h-screen lg:justify-end lg:pr-[16%]">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[calc(100%-2rem)] font-poppins lg:max-w-[321px]"
          noValidate
        >
          <h1 className="whitespace-nowrap text-center text-[calc(1.4rem+0.7vw)] font-bold leading-tight text-[#071c38]">
            Ravi de vous revoir !
          </h1>
          <p className="mt-1 text-center text-[calc(0.9rem+0.25vw)] text-[#071c38]">Bienvenue sur votre espace</p>

          {error && (
            <p className="mt-4 rounded-[12px] bg-red-50 px-4 py-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}

          <label className="mt-8 flex h-[63px] w-full items-center gap-4 rounded-[50px] border border-[#eee] bg-white px-7">
            <svg className="h-[22px] w-[22px] shrink-0 text-[#B0B0B0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <input
              type="email"
              required
              autoComplete="off"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white text-[15px] text-[#333] placeholder:text-[#B0B0B0] focus:outline-none"
            />
          </label>

          <label className="mt-4 flex h-[63px] w-full items-center gap-4 rounded-[50px] border border-[#eee] bg-white px-7">
            <svg className="h-[22px] w-[22px] shrink-0 text-[#B0B0B0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white text-[15px] text-[#333] placeholder:text-[#B0B0B0] focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 flex h-[60px] w-full items-center justify-center rounded-[50px] bg-[#004B87] text-[15px] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
