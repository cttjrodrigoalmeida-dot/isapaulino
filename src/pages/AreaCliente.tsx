import { useEffect, useState, type FormEvent } from "react";
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
  phase: string | null; contractTitle: string;
}
interface Overview {
  client: { name: string; email: string | null; phone: string | null; photoUrl: string | null; avatar: string | null; gender: string | null };
  contracts: Contract[];
  installments: Installment[];
  history: HistoryItem[];
  files: ClientFile[];
  projectHistory: ProjectHistoryItem[];
}

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

  const load = async () => {
    try {
      const res = await fetch("/api/client/overview", { credentials: "include" });
      if (res.ok) {
        setData(await res.json());
        setState("ok");
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

  const logout = async () => {
    await fetch("/api/client/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setState("noauth");
    setData(null);
  };

  if (state === "loading") return <div className={styles.center}>Carregando…</div>;

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

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.topLogo} />
        <div className={styles.topRight}>
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

      <main className={styles.main}>
        <h1 className={styles.hello}>Olá, {first}! 👋</h1>
        <p className={styles.sub}>Aqui você acompanha seu contrato, pagamentos e serviços.</p>

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

        {d.projectHistory && d.projectHistory.length > 0 && (
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
                        {!last && <span style={{ flex: 1, width: 2, background: "rgba(0,0,0,0.12)", marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{meta.label}</span>
                          <span style={{ fontSize: 12.5, opacity: 0.65 }}>{fmtDate(h.date)}</span>
                          {h.phase && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(0,0,0,0.06)", opacity: 0.85 }}>{h.phase}</span>}
                        </div>
                        <div style={{ marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{h.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        )}

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

        {d.history.length > 0 && (
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

        {d.files && d.files.length > 0 && (
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

        {briefings.length > 0 && (
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

        <footer className={styles.footer}>ISABELA PAULINO STUDIO · ÁREA DO CLIENTE</footer>
      </main>
    </div>
  );
}
