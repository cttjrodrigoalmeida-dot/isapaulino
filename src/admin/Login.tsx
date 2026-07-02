import { useState } from "react";
import { api, ApiError } from "./api";
import styles from "./Admin.module.css";

const IconUser = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
  </svg>
);
const IconEye = ({ off }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" strokeLinecap="round" />}
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState(() => {
    try {
      return window.localStorage.getItem("ips_admin_user") ?? "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await api.login(username.trim(), password);
      try {
        if (remember) window.localStorage.setItem("ips_admin_user", username.trim());
        else window.localStorage.removeItem("ips_admin_user");
      } catch {
        /* ignore */
      }
      onLoggedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <div className={styles.loginPattern} aria-hidden />
      <div className={styles.loginVignette} aria-hidden />

      <form className={styles.loginSplit} onSubmit={submit}>
        {/* Coluna esquerda — marca */}
        <div className={styles.loginLeft}>
          <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.loginLogoImg} />
          <div className={styles.loginLeftBottom}>
            <h1 className={styles.loginBigTitle}>
              PAINEL<br />ISABELA PAULINO
            </h1>
            <span className={styles.loginAccess}>Acesso restrito ao estúdio</span>
            <span className={styles.loginDivider} />
          </div>
        </div>

        {/* Coluna direita — formulário */}
        <div className={styles.loginRight}>
          {error && <div className={styles.error}>{error}</div>}
          {notice && <div className={styles.notice}>{notice}</div>}

          <div className={styles.loginField}>
            <label className={styles.loginLabel}>Usuário</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}><IconUser /></span>
              <input
                className={styles.loginInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.loginField}>
            <label className={styles.loginLabel}>Senha</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}><IconLock /></span>
              <input
                className={styles.loginInput}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                <IconEye off={show} />
              </button>
            </div>
          </div>

          <div className={styles.loginRow}>
            <button
              type="button"
              className={`${styles.remember} ${remember ? styles.rememberOn : ""}`}
              onClick={() => setRemember((r) => !r)}
            >
              <span className={styles.rememberBox}>{remember && <IconCheck />}</span>
              Lembrar senha
            </button>
          </div>

          <div className={styles.loginActions}>
            <button
              type="button"
              className={styles.forgot}
              onClick={() =>
                setNotice(
                  "Recuperação por e-mail em breve. Já dentro do painel, use o menu do usuário → “Alterar senha”."
                )
              }
            >
              Esqueceu sua senha?
            </button>
            <button type="submit" className={styles.enterBtn} disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
              {!loading && <IconArrow />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
