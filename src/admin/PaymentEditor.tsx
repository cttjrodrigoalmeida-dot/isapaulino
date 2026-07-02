import type { Proposal } from "../components/proposal/types";
import ListEditor from "./ListEditor";
import styles from "./Admin.module.css";

// Editor de pagamento. Os valores numéricos (PIX à vista e parcelas) são
// calculados pelo pai a partir do total; aqui editamos % de desconto PIX,
// nº de parcelas e os textos (chave, observações).
export default function PaymentEditor({
  proposal,
  pixDiscount,
  maxInstallments,
  onChange,
  onPayChange,
}: {
  proposal: Proposal;
  pixDiscount: number;
  maxInstallments: number;
  onChange: (next: Proposal) => void;
  onPayChange: (pixDiscount: number, maxInstallments: number) => void;
}) {
  const pix = proposal.pixPlan;
  const inst = proposal.installmentPlan;

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Forma de pagamento</div>

      {/* Card 01 — PIX à vista */}
      <div className={styles.blockCard}>
        <div className={styles.blockTag}>Card 01 · PIX à vista</div>
        <div className={styles.comboToggle} style={{ marginTop: 12 }}>
          <span>Desconto à vista</span>
          <input
            type="number"
            min={0}
            max={100}
            className={`${styles.input} ${styles.percentInput}`}
            value={pixDiscount}
            onChange={(e) =>
              onPayChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)), maxInstallments)
            }
          />
          <span>%</span>
        </div>
        <div className={styles.payPreview}>
          <span>De <s>{pix?.fromValue}</s></span>
          <span>Economiza <strong>{pix?.saveAmount}</strong></span>
          <span>Você paga <strong className={styles.totalValue}>{pix?.payValue}</strong></span>
          <span className={styles.badgeDraft} style={{ alignSelf: "center" }}>{pix?.discountLabel}</span>
        </div>
        <div className={styles.field} style={{ marginTop: 12 }}>
          <label className={styles.label}>Rodapé do card (opcional)</label>
          <input
            className={styles.input}
            value={pix?.footnote ?? ""}
            onChange={(e) => onChange({ ...proposal, pixPlan: { ...pix!, footnote: e.target.value } })}
          />
        </div>
      </div>

      {/* Card 02 — Parcelamento */}
      <div className={styles.blockCard}>
        <div className={styles.blockTag}>Card 02 · Parcelamento</div>
        <div className={styles.comboToggle} style={{ marginTop: 12 }}>
          <span>Número máximo de parcelas</span>
          <input
            type="number"
            min={1}
            max={12}
            className={`${styles.input} ${styles.percentInput}`}
            value={maxInstallments}
            onChange={(e) =>
              onPayChange(pixDiscount, Math.max(1, Math.min(12, Number(e.target.value) || 1)))
            }
          />
          <span>x</span>
        </div>
        <p className={styles.pageHint} style={{ marginTop: 6 }}>{inst?.headline}</p>
        <div className={styles.lineList} style={{ marginTop: 6 }}>
          {(inst?.rows ?? []).map((r, i) => (
            <div key={i} className={styles.subtotalRow} style={{ borderTop: "none", padding: "2px 0" }}>
              <span>{r.label}</span>
              <span className={styles.mono}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className={styles.field} style={{ marginTop: 10 }}>
          <label className={styles.label}>Observações (uma por linha)</label>
          <ListEditor
            items={inst?.notes ?? []}
            onChange={(notes) => onChange({ ...proposal, installmentPlan: { ...inst!, notes } })}
            placeholder="ex.: Vencimentos definidos previamente"
          />
        </div>
      </div>

      {/* Chave PIX + textos */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Chave PIX (texto exibido)</label>
          <input className={styles.input} value={proposal.pixKey} onChange={(e) => onChange({ ...proposal, pixKey: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Valor da chave (botão copiar)</label>
          <input className={styles.input} value={proposal.pixKeyValue ?? ""} onChange={(e) => onChange({ ...proposal, pixKeyValue: e.target.value })} />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Lembrete ao lado da chave (opcional)</label>
        <input className={styles.input} value={proposal.pixReminder ?? ""} onChange={(e) => onChange({ ...proposal, pixReminder: e.target.value })} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Observação geral de pagamento (opcional)</label>
        <textarea className={styles.textarea} rows={2} value={proposal.paymentNote ?? ""} onChange={(e) => onChange({ ...proposal, paymentNote: e.target.value })} />
      </div>
    </div>
  );
}
