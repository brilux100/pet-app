"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import PupilCareApp from "./pupilcare-app";

type AuthConfig =
  | { configured: false }
  | { configured: true; url: string; anonKey: string };

type AuthMode = "signin" | "signup";

export default function PupilCareAuth() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function initialize() {
      try {
        const response = await fetch("/api/supabase-config", { cache: "no-store" });
        const config = (await response.json()) as AuthConfig;
        if (!mounted || !config.configured) {
          if (mounted) setReady(true);
          return;
        }

        const supabase = createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setClient(supabase);
        setSession(data.session);
        setReady(true);

        const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
        });
        unsubscribe = () => listener.data.subscription.unsubscribe();
      } catch {
        if (mounted) setReady(true);
      }
    }

    void initialize();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!client || !session?.user) return;
    const user = session.user;
    void client.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "id" },
    );
  }, [client, session]);

  if (!ready) {
    return (
      <main className="auth-loading">
        <span className="auth-loader" />
        <strong>Otwieramy PupilCare…</strong>
      </main>
    );
  }

  if (demo || !client) {
    if (demo) return <PupilCareApp />;
    return <AuthScreen client={null} onDemo={() => setDemo(true)} />;
  }

  if (!session) {
    return <AuthScreen client={client} onDemo={() => setDemo(true)} />;
  }

  return (
    <PupilCareApp
      supabase={client}
      userId={session.user.id}
      userEmail={session.user.email ?? undefined}
      accessToken={session.access_token}
      onSignOut={() => client.auth.signOut()}
    />
  );
}

function AuthScreen({ client, onDemo }: { client: SupabaseClient | null; onDemo: () => void }) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const configured = Boolean(client);

  const socialLogin = async (provider: "google" | "facebook" | "apple") => {
    if (!client) return;
    setPending(true);
    setMessage("");
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setMessage(error.message);
      setPending(false);
    }
  };

  const emailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setPending(true);
    setMessage("");

    const result = mode === "signup"
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await client.auth.signInWithPassword({ email, password });

    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) {
      setMessage("Sprawdź skrzynkę e-mail i potwierdź utworzenie konta.");
    }
    setPending(false);
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand auth-brand">
          <div className="brand-mark">🐾</div>
          <div><strong>PupilCare</strong><span>pet care hub</span></div>
        </div>
        <div>
          <span className="auth-eyebrow">Cała opieka w jednym miejscu</span>
          <h1>Twój pupil.<br />Jeden profil.<br />Każda potrzeba.</h1>
          <p>Weterynarz 24/7, AI, wizyty, dokumenty, usługi i przypomnienia zawsze pod ręką.</p>
        </div>
        <div className="auth-trust"><span>✓</span> Dane pupila widzisz tylko Ty</div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-eyebrow">Witaj w PupilCare</span>
          <h2>{mode === "signin" ? "Zaloguj się" : "Utwórz bezpłatne konto"}</h2>
          <p className="auth-subtitle">Zapisuj historię opieki i wracaj do niej na każdym urządzeniu.</p>

          <div className="social-auth-grid">
            <button disabled={!configured || pending} onClick={() => socialLogin("google")}><b>G</b> Google</button>
            <button disabled={!configured || pending} onClick={() => socialLogin("apple")}><b>●</b> Apple</button>
            <button disabled={!configured || pending} onClick={() => socialLogin("facebook")}><b>f</b> Facebook</button>
          </div>

          <div className="auth-divider"><span>lub przez e-mail</span></div>

          <form className="auth-form" onSubmit={emailLogin}>
            <label><span>E-mail</span><input name="email" type="email" autoComplete="email" placeholder="ty@example.com" required disabled={!configured} /></label>
            <label><span>Hasło</span><input name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Minimum 8 znaków" required disabled={!configured} /></label>
            <button className="auth-submit" type="submit" disabled={!configured || pending}>
              {pending ? "Chwileczkę…" : mode === "signin" ? "Zaloguj się" : "Utwórz konto"}
            </button>
          </form>

          {message && <p className="auth-message" role="status">{message}</p>}
          {!configured && <p className="auth-setup">Logowanie jest przygotowane. Po podłączeniu projektu Supabase przyciski staną się aktywne.</p>}

          <button className="auth-mode" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
          <button className="auth-demo" onClick={onDemo}>Otwórz wersję demonstracyjną</button>
          <small className="auth-legal">Kontynuując, akceptujesz regulamin i politykę prywatności PupilCare.</small>
        </div>
      </section>
    </main>
  );
}
