import { useEffect, useState } from "react";
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
interface Overview {
  client: { name: string; email: string | null; phone: string | null };
  contracts: Contract[];
  installments: Installment[];
  history: HistoryItem[];
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtBRL = (n: number | null) => (n == null ? "—" : BRL.format(n));
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
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
  const [state, setState] = useState<"loading" | "ok" | "noauth">("loading");
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    document.title = "Área do Cliente · Isabela Paulino Studio";
    (async () => {
      try {
        const res = await fetch("/api/client/overview", { credentials: "include" });
        if (res.ok) {
          setData(await res.json());
          setState("ok");
        } else setState("noauth");
      } catch {
        setState("noauth");
      }
    })();
  }, []);

  const logout = async () => {
    await fetch("/api/client/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setState("noauth");
    setData(null);
  };

  if (state === "loading") return <div className={styles.center}>Carregando…</div>;

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
            <h2 className={styles.h2}>Serviços adicionais</h2>
            <div className={styles.card}>
              {d.history.map((h) => {
                const paid = h.status === "paid";
                return (
                  <div key={h.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowLabel}>{h.description}</span>
                      <span className={styles.rowSub}>{fmtDate(h.date)}</span>
                    </div>
                    <span className={styles.rowValue}>{fmtBRL(h.amount)}</span>
                    <span className={`${styles.badge} ${paid ? styles.stPaid : styles.stPending}`}>{paid ? "Pago" : "A pagar"}</span>
                    <span className={styles.rowAction}>
                      {!paid && h.invoiceUrl && (
                        <a className={`${styles.btn} ${styles.btnPrimary}`} href={h.invoiceUrl} target="_blank" rel="noopener noreferrer">Pagar</a>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className={styles.footer}>ISABELA PAULINO STUDIO · ÁREA DO CLIENTE</footer>
      </main>
    </div>
  );
}
