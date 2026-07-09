import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./AreaCliente.module.css";

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
interface Overview {
  client: { name: string; email: string | null; phone: string | null };
  contracts: Contract[];
  installments: Installment[];
  history: HistoryItem[];
  files: ClientFile[];
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

  const load = async () => {
    try {
      const res = await fetch("/api/client/overview", { credentials: "include" });
      if (res.ok) {
        setData(await res.json());
        setState("ok");
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
      <div className={styles.center}>
        <div className={styles.gate}>
          <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.gateLogo} />
          <h1 className={styles.gateTitle}>Área do Cliente</h1>
          {erro === "link" && <p className={styles.err}>Link inválido ou expirado. Peça um novo ao estúdio.</p>}
          {erro === "acesso" && <p className={styles.err}>Seu acesso ainda não foi liberado. Fale com o estúdio.</p>}
          <p className={styles.gateText}>
            Para entrar, use o <strong>link exclusivo</strong> que o estúdio enviou pra você (WhatsApp ou e-mail).
          </p>
        </div>
      </div>
    );
  }

  const d = data!;
  const first = d.client.name.split(" ")[0];
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.topLogo} />
        <div className={styles.topRight}>
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

        <footer className={styles.footer}>ISABELA PAULINO STUDIO · ÁREA DO CLIENTE</footer>
      </main>
    </div>
  );
}
