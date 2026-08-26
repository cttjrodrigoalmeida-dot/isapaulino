import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { eventTypeMeta } from "../projectEvents";
import { AvatarSVG, AvatarPicker, avatarById } from "../avatars";
import styles from "./AreaCliente.module.css";
import admin from "../admin/Admin.module.css";

// Ícones do login (mesmos do painel).
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
  </svg>
);
const IconEye = ({ off }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" strokeLinecap="round" />}
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSun = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
  </svg>
);

// Abertura de marca ao entrar: a logo aparece em tela cheia e revela a área.
// Some sozinha (~2s) ou ao toque; respeita "reduzir movimento".
function IntroSplash({ onDone }: { onDone: () => void }) {
  const [closing, setClosing] = useState(false);
  const finish = () => setClosing(true);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(finish, reduce ? 700 : 2000);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(onDone, 420);
    return () => window.clearTimeout(t);
  }, [closing, onDone]);
  return (
    <div
      className={`${styles.intro} ${closing ? styles.introClosing : ""}`}
      onClick={finish}
      role="button"
      aria-label="Entrar na Área do Cliente"
    >
      <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.introLogo} />
      <span className={styles.introWord}>Área do Cliente</span>
    </div>
  );
}

interface Contract {
  id: string; title: string; status: string; slug: string | null;
  value: number | null; autentiqueUrl: string | null; signedAt: string | null;
}
interface Installment {
  id: string; number: number; dueDate: string; amount: number; status: string;
  paymentDate: string | null; asaasPaymentId: string | null; invoiceUrl: string | null; contractTitle: string;
}
interface HistoryItem {
  id: string; date: string; description: string; amount: number; kind: string;
  status: string; asaasPaymentId: string | null; invoiceUrl: string | null;
}
interface ClientFile {
  key: string; name: string; size: number; uploaded: string;
}
interface ProjectHistoryItem {
  id: string; contractId: string; date: string; type: string; description: string;
  phase: string | null; categories: string | null; contractTitle: string;
}
interface Overview {
  client: { name: string; email: string | null; phone: string | null; cpfCnpj: string | null; address: string | null; city: string | null; state: string | null; photoUrl: string | null; avatar: string | null; gender: string | null };
  contracts: Contract[];
  installments: Installment[];
  history: HistoryItem[];
  files: ClientFile[];
  projectHistory: ProjectHistoryItem[];
  sheet: ClientSheetView | null;
}
interface SheetRowView {
  id: string; date: string; description: string; categories: string; unit: string;
  unitValue: string; discount: string; finalValue: string; status: string; phase: string;
  cellColors?: Record<string, string>;
}
interface ClientSheetView { rows: SheetRowView[]; colColors: Record<string, string> }
const SHEET_COLS: { key: keyof SheetRowView; label: string }[] = [
  { key: "date", label: "Data" },
  { key: "description", label: "Projeto" },
  { key: "categories", label: "Categorias" },
  { key: "unit", label: "Unidade" },
  { key: "unitValue", label: "Valor inicial/un" },
  { key: "discount", label: "Desconto" },
  { key: "finalValue", label: "Valor final" },
  { key: "status", label: "Situação" },
  { key: "phase", label: "Fase" },
];
const SHEET_STATUS_LABEL: Record<string, string> = { pendente: "Pendente", gratuito: "Gratuito", pago: "Pago" };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtBRL = (n: number | null) => (n == null ? "—" : BRL.format(n));
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function groupByContract(items: ProjectHistoryItem[]): [string, ProjectHistoryItem[]][] {
  const map = new Map<string, ProjectHistoryItem[]>();
  for (const it of items) {
    const arr = map.get(it.contractId) ?? [];
    arr.push(it);
    map.set(it.contractId, arr);
  }
  return [...map.entries()];
}

// Textos do mini tutorial por aba.
const TAB_HELP: Record<string, string> = {
  inicio: "Um resumo rápido do seu projeto: próximo pagamento, status do contrato e o andamento — tudo à primeira vista.",
  contrato: "Aqui você vê e baixa seu contrato. Se ainda estiver pendente, é aqui que você assina.",
  pagamentos: "Suas parcelas: o que já foi pago e o que está em aberto, com botão para pagar direto.",
  andamento: "A linha do tempo do seu projeto — cada etapa registrada pelo estúdio.",
  arquivos: "Os arquivos que o estúdio compartilhou com você ficam aqui para baixar.",
  briefings: "Responda ou edite os formulários (briefings) do seu projeto quando quiser.",
  dados: "Mantenha seu contato atualizado (nome, e-mail, telefone). É só o que você pode editar.",
};

interface TourStep { selector: string; title: string; text: string }

// Mini tutorial: escurece a tela e acende um "holofote" no elemento da vez,
// com uma janelinha clara explicando. Anterior/Próximo/Pular.
function TourOverlay({ steps, index, onPrev, onNext, onClose }: {
  steps: TourStep[]; index: number; onPrev: () => void; onNext: () => void; onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) { el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); setRect(el.getBoundingClientRect()); }
      else setRect(null);
    };
    measure();
    const t = window.setTimeout(measure, 300); // remede após o scroll
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [step.selector]);

  const pad = 8;
  const last = index === steps.length - 1;
  const popW = Math.min(320, (typeof window !== "undefined" ? window.innerWidth : 360) - 24);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      {rect ? (
        <div className={styles.tourSpot} style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : (
        <div className={styles.tourVeil} />
      )}
      <div className={styles.tourPop} style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: popW }}>
        <div className={styles.tourStepNo}>{index + 1} de {steps.length}</div>
        <h3 className={styles.tourTitle}>{step.title}</h3>
        <p className={styles.tourText}>{step.text}</p>
        <div className={styles.tourActions}>
          <button type="button" className={styles.tourSkip} onClick={onClose}>Pular</button>
          <div style={{ display: "flex", gap: 8 }}>
            {index > 0 && <button type="button" className={styles.tourBtn} onClick={onPrev}>Anterior</button>}
            <button type="button" className={`${styles.tourBtn} ${styles.tourBtnPrimary}`} onClick={last ? onClose : onNext}>
              {last ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const INST_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "stPending" },
  confirmed: { label: "Confirmado", cls: "stPaid" },
  received: { label: "Pago", cls: "stPaid" },
  overdue: { label: "Atrasado", cls: "stOverdue" },
  deleted: { label: "—", cls: "stPending" },
};

export default function AreaCliente() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "noauth" | "verify">("loading");
  const [data, setData] = useState<Overview | null>(null);
  const [cpf, setCpf] = useState("");
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [briefings, setBriefings] = useState<{ number: string; title: string | null; responded: boolean }[]>([]);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [avatarSel, setAvatarSel] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", cpf_cnpj: "", address: "", city: "", state: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  // Abertura de marca (uma vez por sessão do navegador).
  const [intro, setIntro] = useState(false);
  // Tema claro/escuro (lembrado no navegador) + aba ativa.
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("ips_client_theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
  });
  const toggleTheme = () => setTheme((t) => {
    const n = t === "light" ? "dark" : "light";
    try { localStorage.setItem("ips_client_theme", n); } catch { /* ignore */ }
    return n;
  });
  const [tab, setTab] = useState<string>("inicio");
  // Mini tutorial (holofote): índice do passo, ou null quando fechado.
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourAuto = useRef(false); // auto-inicia uma vez por montagem
  const endTour = () => {
    setTourStep(null);
    try { localStorage.setItem("ips_client_tour_done", "1"); } catch { /* ignore */ }
  };

  const load = async () => {
    try {
      const res = await fetch("/api/client/overview", { credentials: "include" });
      if (res.ok) {
        // Login único: se veio de um link de proposta/contrato/briefing
        // (?next=/caminho interno), volta direto ao documento após logar.
        const nxt = params.get("next");
        if (nxt && nxt.startsWith("/") && !nxt.startsWith("//")) {
          window.location.replace(nxt);
          return;
        }
        const j: Overview = await res.json();
        setData(j);
        setProfile({
          name: j.client.name ?? "", email: j.client.email ?? "", phone: j.client.phone ?? "",
          cpf_cnpj: j.client.cpfCnpj ?? "", address: j.client.address ?? "", city: j.client.city ?? "", state: j.client.state ?? "",
        });
        setState("ok");
        // Abertura da marca: só na 1ª entrada da sessão (não repete a cada reload/salvamento).
        try {
          if (!sessionStorage.getItem("ips_client_intro_seen")) {
            sessionStorage.setItem("ips_client_intro_seen", "1");
            setIntro(true);
          }
        } catch { /* sessionStorage indisponível */ }
        try {
          const br = await fetch("/api/client/briefings", { credentials: "include" });
          if (br.ok) setBriefings((await br.json()).briefings ?? []);
        } catch { /* opcional */ }
      } else if (res.status === 428) {
        setState("verify"); // sessão válida, mas falta confirmar o CPF
      } else setState("noauth");
    } catch {
      setState("noauth");
    }
  };

  useEffect(() => {
    document.title = "Área do Cliente · Isabela Paulino Studio";
    load();
  }, []);

  // Auto-inicia o tutorial uma vez (após a abertura, só na 1ª visita).
  useEffect(() => {
    if (state !== "ok" || intro || tourAuto.current) return;
    tourAuto.current = true;
    let done = false;
    try { done = localStorage.getItem("ips_client_tour_done") === "1"; } catch { /* ignore */ }
    if (!done) {
      const t = window.setTimeout(() => setTourStep(0), 500);
      return () => window.clearTimeout(t);
    }
  }, [state, intro]);

  const submitCpf = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyErr(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/client/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      if (res.ok) {
        await load();
      } else {
        const b = await res.json().catch(() => ({}));
        setVerifyErr(b?.error || "Não foi possível confirmar. Tente novamente.");
      }
    } catch {
      setVerifyErr("Erro de conexão. Tente novamente.");
    } finally {
      setVerifying(false);
    }
  };

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      if (res.ok) {
        await load();
      } else {
        const b = await res.json().catch(() => ({}));
        setLoginErr(b?.error || "Usuário ou senha inválidos.");
      }
    } catch {
      setLoginErr("Erro de conexão. Tente novamente.");
    } finally {
      setLoggingIn(false);
    }
  };

  const saveAvatar = async () => {
    if (!avatarSel) return;
    setAvatarSaving(true);
    try {
      const res = await fetch("/api/client/avatar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarSel }),
      });
      if (res.ok) { setAvatarOpen(false); await load(); }
    } catch { /* ignore */ }
    finally { setAvatarSaving(false); }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!profile.name.trim()) { setProfileMsg("Informe seu nome."); return; }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) { setProfileMsg("Dados atualizados ✓"); await load(); }
      else { const b = await res.json().catch(() => ({})); setProfileMsg(b?.error || "Não foi possível salvar."); }
    } catch { setProfileMsg("Erro de conexão."); }
    finally { setProfileSaving(false); }
  };

  const logout = async () => {
    await fetch("/api/client/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setState("noauth");
    setData(null);
  };

  if (state === "loading") return <div className={styles.center}>Carregando…</div>;

  // Abertura de marca — aparece ao entrar e revela a área.
  if (intro && state === "ok") return <IntroSplash onDone={() => setIntro(false)} />;

  if (state === "verify") {
    return (
      <div className={styles.center}>
        <form className={styles.gate} onSubmit={submitCpf}>
          <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.gateLogo} />
          <h1 className={styles.gateTitle}>Confirme quem é você</h1>
          {verifyErr && <p className={styles.err}>{verifyErr}</p>}
          <p className={styles.gateText} style={{ marginBottom: 18 }}>
            Por segurança, digite seu <strong>CPF ou CNPJ</strong> para acessar sua área.
          </p>
          <input
            className={styles.verifyInput}
            inputMode="numeric"
            autoFocus
            placeholder="Somente números"
            value={cpf}
            onChange={(ev) => setCpf(ev.target.value)}
          />
          <button className={styles.verifyBtn} type="submit" disabled={verifying}>
            {verifying ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  if (state === "noauth") {
    const erro = params.get("erro");
    return (
      <div className={admin.loginScreen}>
        <div className={admin.loginPattern} aria-hidden />
        <div className={admin.loginVignette} aria-hidden />

        <form className={admin.loginSplit} onSubmit={submitLogin}>
          {/* Coluna esquerda — marca */}
          <div className={admin.loginLeft}>
            <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={admin.loginLogoImg} />
            <div className={admin.loginLeftBottom}>
              <h1 className={admin.loginBigTitle}>ÁREA DO<br />CLIENTE</h1>
              <span className={admin.loginAccess}>Acesso exclusivo do cliente</span>
              <span className={admin.loginDivider} />
            </div>
          </div>

          {/* Coluna direita — formulário */}
          <div className={admin.loginRight}>
            {loginErr && <div className={admin.error}>{loginErr}</div>}
            {erro === "link" && <div className={admin.error}>Link inválido ou expirado. Peça um novo ao estúdio.</div>}
            {erro === "acesso" && <div className={admin.error}>Seu acesso ainda não foi liberado. Fale com o estúdio.</div>}

            <div className={admin.loginField}>
              <label className={admin.loginLabel}>Usuário</label>
              <div className={admin.inputWrap}>
                <span className={admin.inputIcon}><IconUser /></span>
                <input
                  className={admin.loginInput}
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Seu usuário"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className={admin.loginField}>
              <label className={admin.loginLabel}>Senha</label>
              <div className={admin.inputWrap}>
                <span className={admin.inputIcon}><IconLock /></span>
                <input
                  className={admin.loginInput}
                  type={showPass ? "text" : "password"}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button type="button" className={admin.eyeBtn} onClick={() => setShowPass((s) => !s)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
                  <IconEye off={showPass} />
                </button>
              </div>
            </div>

            <div className={admin.loginActions}>
              <span className={admin.forgot} style={{ textDecoration: "none", cursor: "default" }}>
                Esqueceu a senha? Fale com o estúdio.
              </span>
              <button type="submit" className={admin.enterBtn} disabled={loggingIn}>
                {loggingIn ? "Entrando…" : "Entrar"}
                {!loggingIn && <IconArrow />}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const d = data!;
  const first = d.client.name.split(" ")[0];
  const initials = d.client.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  // 1º acesso: escolher avatar é obrigatório. Também aparece ao clicar "trocar".
  if (!avatarById(d.client.avatar) || avatarOpen) {
    const mandatory = !avatarById(d.client.avatar);
    return (
      <div className={admin.loginScreen}>
        <div className={admin.loginPattern} aria-hidden />
        <div className={admin.loginVignette} aria-hidden />
        <div className={admin.loginSplit} style={{ gridTemplateColumns: "1fr", maxWidth: 640 }}>
          <div className={admin.loginRight} style={{ padding: 40 }}>
            <h1 className={admin.loginBigTitle} style={{ fontSize: 24 }}>Escolha seu avatar</h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13.5, margin: "8px 0 20px" }}>
              {mandatory ? `Olá, ${first}! Para começar, escolha um avatar que combine com você.` : "Toque em outro avatar para trocar."}
            </p>
            <AvatarPicker value={avatarSel || d.client.avatar || ""} onChange={setAvatarSel} gender={d.client.gender} size={62} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
              <button className={admin.enterBtn} onClick={saveAvatar} disabled={!avatarSel || avatarSaving}>
                {avatarSaving ? "Salvando…" : "Confirmar"}
              </button>
              {!mandatory && (
                <button type="button" className={admin.forgot} style={{ textDecoration: "none" }} onClick={() => { setAvatarOpen(false); setAvatarSel(""); }}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Destaques + abas (derivados do overview; sem endpoint novo) ──
  const paidSet = new Set(["received", "confirmed"]);
  const openInst = d.installments.filter((i) => !paidSet.has(i.status) && i.status !== "deleted");
  const nextPayment = [...openInst].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0] || null;
  const paidTotal = d.installments.filter((i) => paidSet.has(i.status)).reduce((s, i) => s + (i.amount || 0), 0);
  const pendingTotal = openInst.reduce((s, i) => s + (i.amount || 0), 0);
  const totalKnown = paidTotal + pendingTotal;
  const signedContract = d.contracts.find((c) => c.status === "signed") || null;
  const pendingContract = d.contracts.find((c) => c.status !== "signed") || null;
  const latestEvent = d.projectHistory && d.projectHistory.length
    ? [...d.projectHistory].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0] : null;
  const hasSheet = !!(d.sheet && d.sheet.rows.length);
  const tabs: { id: string; label: string }[] = [
    { id: "inicio", label: "Início" },
    ...(d.contracts.length || hasSheet ? [{ id: "contrato", label: "Contrato" }] : []),
    ...(d.installments.length || d.history.length ? [{ id: "pagamentos", label: "Pagamentos" }] : []),
    ...(d.projectHistory && d.projectHistory.length ? [{ id: "andamento", label: "Andamento" }] : []),
    ...(d.files && d.files.length ? [{ id: "arquivos", label: "Arquivos" }] : []),
    ...(briefings.length ? [{ id: "briefings", label: "Briefings" }] : []),
    { id: "dados", label: "Meus dados" },
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "inicio";

  return (
    <div className={styles.page} data-theme={theme}>
      <header className={styles.top}>
        <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.topLogo} />
        <div className={styles.topRight}>
          <button type="button" data-tour="theme" className={styles.themeBtn} onClick={toggleTheme} aria-label="Alternar tema" title={theme === "dark" ? "Tema claro" : "Tema escuro"}>
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            aria-label="Trocar avatar"
            onClick={() => { setAvatarSel(d.client.avatar || ""); setAvatarOpen(true); }}
            title="Trocar avatar"
            style={{
              width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
              display: "grid", placeItems: "center", background: "rgba(255,255,255,0.1)",
              fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.02em",
              border: "none", padding: 0, cursor: "pointer", lineHeight: 0,
            }}
          >
            {avatarById(d.client.avatar)
              ? <AvatarSVG id={d.client.avatar} size={34} />
              : d.client.photoUrl
                ? <img src={d.client.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{initials}</span>}
          </button>
          <span className={styles.topName}>{d.client.name}</span>
          <button className={styles.logout} onClick={logout}>Sair</button>
        </div>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Área do Cliente</span>
          <h1 className={styles.heroTitle}>Olá, {first} 👋</h1>
          <p className={styles.heroSub}>Aqui você acompanha seu contrato, pagamentos e o andamento do seu projeto — tudo em um lugar só.</p>
        </div>
      </div>

      <div className={styles.tabsBar}>
        <nav className={styles.tabs}>
          {tabs.map((t) => (
            <button key={t.id} type="button" data-tour={`tab-${t.id}`} className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
      </div>

      <main className={styles.main}>
        <div className={styles.tabPanel} key={activeTab}>

        {activeTab === "inicio" && (
          <section className={styles.section}>
            <div className={styles.destaques}>
              <div className={styles.dCard}>
                <span className={styles.dLabel}>Próximo pagamento</span>
                {nextPayment ? (
                  <>
                    <span className={styles.dValue}>{fmtBRL(nextPayment.amount)}</span>
                    <span className={styles.dSub}>{nextPayment.number === 0 ? "Entrada" : `${nextPayment.number}ª parcela`} · vence {fmtDate(nextPayment.dueDate)}</span>
                    {nextPayment.invoiceUrl && <a className={`${styles.btn} ${styles.btnPrimary} ${styles.dCta}`} href={nextPayment.invoiceUrl} target="_blank" rel="noopener noreferrer">Pagar</a>}
                  </>
                ) : (
                  <><span className={styles.dValue}>Em dia ✓</span><span className={styles.dSub}>Nenhum pagamento em aberto.</span></>
                )}
              </div>

              <div className={styles.dCard}>
                <span className={styles.dLabel}>Contrato</span>
                {signedContract ? (
                  <>
                    <span className={styles.dValue}>Assinado</span>
                    <span className={styles.dSub}>{signedContract.title}</span>
                    {signedContract.slug && <a className={`${styles.btn} ${styles.dCta}`} href={`/contrato/${signedContract.slug}`} target="_blank" rel="noopener noreferrer">Ver contrato</a>}
                  </>
                ) : pendingContract ? (
                  <>
                    <span className={styles.dValue}>Aguardando</span>
                    <span className={styles.dSub}>{pendingContract.title}</span>
                    {pendingContract.autentiqueUrl
                      ? <a className={`${styles.btn} ${styles.btnPrimary} ${styles.dCta}`} href={pendingContract.autentiqueUrl} target="_blank" rel="noopener noreferrer">Assinar</a>
                      : pendingContract.slug ? <a className={`${styles.btn} ${styles.dCta}`} href={`/contrato/${pendingContract.slug}`} target="_blank" rel="noopener noreferrer">Ver contrato</a> : null}
                  </>
                ) : (
                  <><span className={styles.dValue}>—</span><span className={styles.dSub}>Nenhum contrato ainda.</span></>
                )}
              </div>

              {latestEvent && (
                <div className={styles.dCard}>
                  <span className={styles.dLabel}>Andamento</span>
                  <span className={styles.dValue} style={{ fontSize: 16 }}>{eventTypeMeta(latestEvent.type).label}</span>
                  <span className={styles.dSub}>{fmtDate(latestEvent.date)}{latestEvent.phase ? ` · ${latestEvent.phase}` : ""}</span>
                  <button type="button" className={`${styles.btn} ${styles.dCta}`} onClick={() => setTab("andamento")}>Ver andamento</button>
                </div>
              )}

              {totalKnown > 0 && (
                <div className={styles.dCard}>
                  <span className={styles.dLabel}>Pagamentos</span>
                  <div className={styles.dRow}><span className={styles.dValue} style={{ fontSize: 17 }}>{fmtBRL(paidTotal)}</span><span className={styles.dSmall}>de {fmtBRL(totalKnown)}</span></div>
                  <div className={styles.dBar}><div className={styles.dBarFill} style={{ width: `${Math.round((paidTotal / totalKnown) * 100)}%` }} /></div>
                  <span className={styles.dSub}>{fmtBRL(pendingTotal)} em aberto</span>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "contrato" && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Seu contrato</h2>
          {d.contracts.length === 0 ? (
            <p className={styles.empty}>Nenhum contrato disponível ainda.</p>
          ) : (
            d.contracts.map((c) => (
              <div key={c.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <div className={styles.cardTitle}>{c.title}</div>
                    <span className={`${styles.badge} ${c.status === "signed" ? styles.stPaid : styles.stPending}`}>
                      {c.status === "signed" ? "Assinado" : "Aguardando assinatura"}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {c.slug && (
                      <a className={styles.btn} href={`/contrato/${c.slug}`} target="_blank" rel="noopener noreferrer">Ver contrato</a>
                    )}
                    {c.status !== "signed" && c.autentiqueUrl && (
                      <a className={`${styles.btn} ${styles.btnPrimary}`} href={c.autentiqueUrl} target="_blank" rel="noopener noreferrer">Assinar</a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
        )}

        {activeTab === "andamento" && d.projectHistory && d.projectHistory.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Andamento do projeto</h2>
            {groupByContract(d.projectHistory).map(([cid, evs]) => (
              <div key={cid} className={styles.card}>
                <div className={styles.cardTitle} style={{ marginBottom: 14 }}>{evs[0].contractTitle}</div>
                {evs.map((h, idx) => {
                  const meta = eventTypeMeta(h.type);
                  const last = idx === evs.length - 1;
                  return (
                    <div key={h.id} style={{ display: "flex", gap: 12, paddingBottom: last ? 0 : 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ width: 13, height: 13, borderRadius: "50%", background: meta.color, marginTop: 3, flexShrink: 0, boxShadow: `0 0 0 4px ${meta.color}22` }} />
                        {!last && <span style={{ flex: 1, width: 2, background: "var(--ac-line)", marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{meta.label}</span>
                          <span style={{ fontSize: 12.5, opacity: 0.65 }}>{fmtDate(h.date)}</span>
                          {h.phase && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--ac-chip)", opacity: 0.85 }}>{h.phase}</span>}
                        </div>
                        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{h.description}</div>
                        {(h.categories || "").split(",").map((c) => c.trim()).filter(Boolean).length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {(h.categories || "").split(",").map((c) => c.trim()).filter(Boolean).map((cat, j) => (
                              <span key={j} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: `${meta.color}1e`, color: meta.color, border: `1px solid ${meta.color}44` }}>{cat}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        )}

        {activeTab === "contrato" && d.sheet && d.sheet.rows.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Planilha do projeto</h2>
            <div className={styles.card} style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {SHEET_COLS.map((c) => (
                      <th key={c.key} style={{ textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.7, borderBottom: "1px solid var(--ac-border)", background: d.sheet!.colColors[c.key] || undefined }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.sheet.rows.map((r) => (
                    <tr key={r.id}>
                      {SHEET_COLS.map((c) => {
                        const bg = r.cellColors?.[c.key] || d.sheet!.colColors[c.key] || undefined;
                        const val = c.key === "status" ? (SHEET_STATUS_LABEL[r.status] || "") : (r[c.key] as string);
                        return (
                          <td key={c.key} style={{ padding: "8px 10px", borderBottom: "1px solid var(--ac-line)", background: bg, whiteSpace: c.key === "description" || c.key === "categories" ? "normal" : "nowrap" }}>{val || "—"}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "pagamentos" && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Pagamentos</h2>
          {d.installments.length === 0 ? (
            <p className={styles.empty}>Nenhuma parcela cadastrada ainda.</p>
          ) : (
            <div className={styles.card}>
              {d.installments.map((i) => {
                const st = INST_STATUS[i.status] ?? INST_STATUS.pending;
                const paid = i.status === "received" || i.status === "confirmed";
                return (
                  <div key={i.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowLabel}>{i.number === 0 ? "Entrada" : `${i.number}ª parcela`}</span>
                      <span className={styles.rowSub}>Vence {fmtDate(i.dueDate)}</span>
                    </div>
                    <span className={styles.rowValue}>{fmtBRL(i.amount)}</span>
                    <span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span>
                    <span className={styles.rowAction}>
                      {!paid && i.invoiceUrl && (
                        <a className={`${styles.btn} ${styles.btnPrimary}`} href={i.invoiceUrl} target="_blank" rel="noopener noreferrer">Pagar</a>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        {activeTab === "pagamentos" && d.history.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Histórico financeiro</h2>
            <div className={styles.card}>
              {d.history.map((h) => {
                // pago / cobrado (aguardando pagamento) / pendente (lançado, ainda não cobrado)
                const hs =
                  h.status === "paid"
                    ? { label: "Pago", cls: styles.stPaid }
                    : h.status === "charged"
                    ? { label: "A pagar", cls: styles.stPending }
                    : { label: "Pendente", cls: styles.stPending };
                return (
                  <div key={h.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowLabel}>{h.description}</span>
                      <span className={styles.rowSub}>{fmtDate(h.date)}</span>
                    </div>
                    <span className={styles.rowValue}>{fmtBRL(h.amount)}</span>
                    <span className={`${styles.badge} ${hs.cls}`}>{hs.label}</span>
                    <span className={styles.rowAction}>
                      {h.status === "charged" && h.invoiceUrl && (
                        <a className={`${styles.btn} ${styles.btnPrimary}`} href={h.invoiceUrl} target="_blank" rel="noopener noreferrer">Pagar</a>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "arquivos" && d.files && d.files.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Arquivos do projeto</h2>
            <div className={styles.card}>
              {d.files.map((f) => (
                <div key={f.key} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowLabel}>{f.name}</span>
                    <span className={styles.rowSub}>{fmtBytes(f.size)} · {fmtDate(f.uploaded)}</span>
                  </div>
                  <span className={styles.rowAction}>
                    <a className={`${styles.btn} ${styles.btnPrimary}`} href={`/api/client/download?key=${encodeURIComponent(f.key)}`} target="_blank" rel="noopener noreferrer">Baixar</a>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "briefings" && briefings.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Briefings</h2>
            <div className={styles.card}>
              {briefings.map((b) => (
                <div key={b.number} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowLabel}>{b.title || `Briefing Nº ${b.number}`}</span>
                    <span className={styles.rowSub}>{b.responded ? "Respondido — você pode editar quando quiser" : "Aguardando suas respostas"}</span>
                  </div>
                  <span className={styles.rowAction}>
                    <a className={`${styles.btn} ${styles.btnPrimary}`} href={`/briefing/${b.number}`}>{b.responded ? "Editar respostas" : "Responder"}</a>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "dados" && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Meus dados</h2>
          <form className={styles.card} onSubmit={saveProfile}>
            <div className={styles.profileGrid}>
              <label className={styles.profileField}>
                <span className={styles.profileLabel}>Nome</span>
                <input className={styles.profileInput} value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className={styles.profileField}>
                <span className={styles.profileLabel}>E-mail</span>
                <input className={styles.profileInput} type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
              </label>
              <label className={styles.profileField}>
                <span className={styles.profileLabel}>Telefone</span>
                <input className={styles.profileInput} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" inputMode="tel" />
              </label>
              <label className={styles.profileField}>
                <span className={styles.profileLabel}>CPF / CNPJ</span>
                <input className={styles.profileInput} value={profile.cpf_cnpj} onChange={(e) => setProfile((p) => ({ ...p, cpf_cnpj: e.target.value }))} inputMode="numeric" />
              </label>
              <label className={styles.profileField} style={{ gridColumn: "1 / -1" }}>
                <span className={styles.profileLabel}>Endereço</span>
                <input className={styles.profileInput} value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} placeholder="Rua, número, complemento" />
              </label>
              <label className={styles.profileField}>
                <span className={styles.profileLabel}>Cidade</span>
                <input className={styles.profileInput} value={profile.city} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} />
              </label>
              <label className={styles.profileField}>
                <span className={styles.profileLabel}>UF</span>
                <input className={styles.profileInput} value={profile.state} onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} placeholder="SP" />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={profileSaving}>
                {profileSaving ? "Salvando…" : "Salvar meus dados"}
              </button>
              {profileMsg && <span className={styles.profileMsg}>{profileMsg}</span>}
            </div>
            <p className={styles.profileNote}>
              Você edita apenas seus dados de contato. Contratos, pagamentos e o andamento do projeto são só para consulta.
            </p>
          </form>
        </section>
        )}

        </div>{/* fim do tabPanel */}
        <footer className={styles.footer}>
          <button type="button" className={styles.tourReplay} onClick={() => setTourStep(0)}>❔ Rever tutorial</button>
          <div>ISABELA PAULINO STUDIO · ÁREA DO CLIENTE</div>
        </footer>
      </main>

      {tourStep !== null && (() => {
        const tourSteps: TourStep[] = [
          ...tabs.map((t) => ({ selector: `[data-tour="tab-${t.id}"]`, title: t.label, text: TAB_HELP[t.id] || "" })),
          { selector: '[data-tour="theme"]', title: "Tema claro/escuro", text: "Toque aqui para alternar entre o tema claro e o escuro — como preferir." },
        ];
        const idx = Math.min(tourStep, tourSteps.length - 1);
        return (
          <TourOverlay
            steps={tourSteps}
            index={idx}
            onPrev={() => setTourStep((s) => Math.max(0, (s ?? 0) - 1))}
            onNext={() => setTourStep((s) => (s ?? 0) + 1)}
            onClose={endTour}
          />
        );
      })()}
    </div>
  );
}
