import { useEffect, useState, useRef, createContext, useContext, Fragment } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type {
  ContractDoc,
  ContractParty,
  ContractClause,
  ClauseBlock,
  SignatureStatus,
} from "./types";
import CustomCursor from "../CustomCursor";
import { DEFAULT_VALIDADE_CARDS } from "./contractDefaults";
import { exportElementToPdf, waitForRenderReady } from "../../lib/pdfExport";
import styles from "./ContractView.module.css";

const PrintContext = createContext(false);

const STATUS_LABEL: Record<SignatureStatus, string> = {
  aguardando: "AGUARDANDO ASSINATURA",
  pendente: "ASSINATURA PENDENTE",
  assinado: "ASSINADO",
  cancelado: "CANCELADO",
};

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function formatDateExtenso(d: string): string {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return d;
  const month = MONTHS_PT[parseInt(m[2], 10) - 1];
  if (!month) return d;
  return `${parseInt(m[1], 10)} de ${month.charAt(0).toUpperCase()}${month.slice(1)} de ${m[3]}`;
}

// ── Ícones inline ──────────────────────────────────────────────
const IconDownload = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
// Ampulheta — ícone de "início / data de disponibilidade" (cláusula 18).
const IconHourglass = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M7 4h10M7 20h10M8 4c0 3.5 8 4.5 8 8s-8 4.5-8 8M16 4c0 3.5-8 4.5-8 8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
  </svg>
);
const IconPeople = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8.5" cy="9" r="3" />
    <circle cx="16.5" cy="9.5" r="2.4" />
    <path d="M3 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5M15 19c0-2.2 1.6-3.6 3.8-3.6" strokeLinecap="round" />
  </svg>
);
const IconWarning = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M12 4l9 16H3z" strokeLinejoin="round" />
    <path d="M12 10v4M12 17v.01" strokeLinecap="round" />
  </svg>
);
const IconFolder = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinejoin="round" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 11v5M12 7.6v.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCopy = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </svg>
);
const IconPercent = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);
const IconPix = () => (
  <svg viewBox="0 0 32 32" width="19" height="19" fill="currentColor" aria-hidden>
    <path d="M16 2.6l4.7 4.7-4.7 4.7-4.7-4.7L16 2.6zM7.3 11.3l4.7 4.7-4.7 4.7L2.6 16l4.7-4.7zm17.4 0L29.4 16l-4.7 4.7L20 16l4.7-4.7zM16 20l4.7 4.7L16 29.4l-4.7-4.7L16 20z" />
  </svg>
);
const IconWallet = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4Z" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M7.5 10.5V7a4.5 4.5 0 019 0v3.5" strokeLinecap="round" />
  </svg>
);
const IconLockSm = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M7.5 10.5V7a4.5 4.5 0 019 0v3.5" strokeLinecap="round" />
  </svg>
);
const IconQuestion = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.3 9.3a2.7 2.7 0 015.2 1c0 1.8-2.5 1.8-2.5 3.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 17.2v.01" strokeLinecap="round" />
  </svg>
);
const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

// ── Reveal on scroll (desligado na impressão) ──────────────────
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const printing = useContext(PrintContext);
  if (printing) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Extrai a data final de um intervalo "01/08/2026 a 05/08/2026" (ou a string
// inteira se não houver intervalo) para alimentar a contagem regressiva.
function endDateOf(vencimento: string): string {
  const idx = vencimento.lastIndexOf(" a ");
  return idx >= 0 ? vencimento.slice(idx + 3).trim() : vencimento.trim();
}
function useCountdownTo(dateStr?: string): string | null {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!dateStr) return;
    const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return;
    const target = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), 23, 59, 59).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) return setLeft("VENCIDO");
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const mnt = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`FALTAM ${d}D ${h}H ${mnt}M ${s}S`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateStr]);
  return left;
}

// ── Divisor com estrela (mesmo glifo da página de Briefing) ────
const STAR = "✦";
function DiamondDivider() {
  return (
    <div className={styles.diamondDivider}>
      <span className={styles.diamond} aria-hidden>{STAR}</span>
    </div>
  );
}

// ── Aba + card (padrão visual do PDF) ──────────────────────────
function SectionCard({
  tab,
  tabVariant = "dark",
  bare = false,
  cardBorderVariant,
  children,
  className,
}: {
  tab: string;
  tabVariant?: "dark" | "pink" | "green";
  /** Sem o card externo (borda/fundo) — só a aba + o conteúdo cru. */
  bare?: boolean;
  /** Borda colorida no card: pink (vermelha), green (verde). */
  cardBorderVariant?: "pink" | "green";
  children: ReactNode;
  className?: string;
}) {
  const cardClass = [
    bare ? className : `${styles.card} ${className ?? ""} ${cardBorderVariant === "pink" ? styles.cardBorderPink : cardBorderVariant === "green" ? styles.cardBorderGreen : ""}`,
  ].join(" ");
  return (
    <div className={styles.cardWrap}>
      <span className={`${styles.cardTab} ${
        tabVariant === "pink" ? styles.cardTabPink
        : tabVariant === "green" ? styles.cardTabGreen
        : /CONTRATADA/i.test(tab) ? styles.cardTabContratada
        : /CONTRATANTE/i.test(tab) ? styles.cardTabContratante
        : ""
      }`}>{tab}</span>
      <div className={cardClass}>{children}</div>
    </div>
  );
}

function ClauseHead({ number, title }: { number: string; title: string }) {
  return (
    <>
      <div className={styles.clauseHead}>
        <span className={styles.clauseNum}>{number}</span>
        <h2 className={styles.clauseTitle}>{title}</h2>
      </div>
      <div className={styles.rule} aria-hidden />
    </>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className={styles.infoBox}>
      <span className={styles.infoBoxIcon}><IconInfo /></span>
      <p className={styles.infoBoxText}>{children}</p>
    </div>
  );
}

// Parágrafo com o número da cláusula (1.1., 7.3, 18.2.…) em negrito.
function Block({ block }: { block: ClauseBlock }) {
  if (block.type === "p") {
    const m = block.text.match(/^(\d+(?:\.\d+)*\.?)(\s+)([\s\S]*)$/);
    if (m) {
      return (
        <p className={styles.clauseP}>
          <strong className={styles.clauseNumInline}>{m[1]}</strong>{m[2]}{m[3]}
        </p>
      );
    }
    return <p className={styles.clauseP}>{block.text}</p>;
  }
  return (
    <ul className={styles.clauseList}>
      {block.items.map((it, j) => <li key={j}>{it}</li>)}
    </ul>
  );
}

// ── Card de uma parte (CONTRATANTE / CONTRATADA) ───────────────
function PartyCard({ party }: { party: ContractParty }) {
  const fields: [string, string, boolean][] = [
    ["NACIONALIDADE", party.nacionalidade, false],
    ["CONTATO", party.contato, false],
    ["DATA DE NASCIMENTO", party.nascimento, false],
    ["E-MAIL", party.email, true],
    ["CPF/CNPJ", party.cpfCnpj, false],
    ["ENDEREÇO", party.endereco, false],
  ];
  return (
    <div className={styles.partyCard}>
      <span className={`${styles.partyIcon} ${/CONTRATADA/i.test(party.label) ? styles.partyIconContratada : ""}`}><IconUser /></span>
      <span className={`${styles.partyTag} ${/CONTRATADA/i.test(party.label) ? styles.partyTagContratada : styles.partyTagContratante}`}>{party.label}</span>
      <h3 className={styles.partyName}>{party.name}</h3>
      <span className={styles.partyRole}>{party.role}</span>
      <div className={styles.partyRule} aria-hidden />
      <div className={styles.partyGrid}>
        {fields.map(([k, v, accent]) => (
          <div key={k} className={styles.partyField}>
            <span className={styles.partyFieldLabel}>{k}</span>
            <span className={`${styles.partyFieldValue} ${accent ? styles.partyFieldAccent : ""}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cláusula 02 (escopo) ───────────────────────────────────────
function EscopoCard({ clause, doc }: { clause: ContractClause; doc: ContractDoc }) {
  const [first, ...rest] = clause.blocks;
  const escopoNote = doc.objetoIntro[1];
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title}>
      <ClauseHead number={clause.number} title={clause.title} />
      {first && <Block block={first} />}
      <span className={styles.blockLabel}>AMBIENTES DO ESCOPO</span>
      <div className={styles.chips}>
        {doc.escopoAmbientes.map((a) => <span key={a} className={styles.chip}>{a}</span>)}
      </div>
      {escopoNote && <InfoBox>{escopoNote}</InfoBox>}
      <span className={styles.blockLabel}>2.2. Os serviços incluem:</span>
      <ul className={styles.clauseList}>
        {doc.escopoServicos.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      {rest.map((b, i) => <Block key={i} block={b} />)}
    </SectionCard>
  );
}

// ── Caixa lateral genérica (prazo / arquivos / validade) ───────
type SideRow = { icon: ReactNode; iconMod?: string; rowMod?: string; title: string; caption: string; capTop?: boolean; small?: boolean };

function SideBox({ label, rows, iconsLg }: { label?: string; rows: SideRow[]; iconsLg?: boolean }) {
  return (
    <div className={`${styles.sideBox} ${iconsLg ? styles.sideBoxIconsLg : ""}`}>
      {label && <span className={styles.sideBoxLabel}>{label}</span>}
      <div className={styles.sideList}>
        {rows.map((r, i) => {
          const valClass = `${styles.sideVal} ${r.small ? styles.sideValSm : ""}`;
          return (
            <div key={i} className={`${styles.sideRow} ${r.rowMod ?? ""}`}>
              <span className={`${styles.sideIcon} ${r.iconMod ?? ""}`}>{r.icon}</span>
              <div className={styles.sideRowText}>
                {r.capTop ? (
                  <><span className={styles.sideCap}>{r.caption}</span><span className={valClass}>{r.title}</span></>
                ) : (
                  <><span className={valClass}>{r.title}</span><span className={styles.sideCap}>{r.caption}</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cláusula 05 (prazo) ────────────────────────────────────────
function PrazoCard({ clause, doc }: { clause: ContractClause; doc: ContractDoc }) {
  const rows: SideRow[] = doc.prazoCards.map((c, i) => {
    const isLast = i === doc.prazoCards.length - 1;
    return {
      icon: isLast ? <IconClock /> : <IconCalendar />,
      iconMod: isLast ? styles.sideIconRedOutline : undefined, // "disponível para iniciar": ícone vermelho de borda
      title: c.value,
      caption: c.label,
    };
  });
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title}>
      <ClauseHead number={clause.number} title={clause.title} />
      <div className={styles.sideGrid}>
        <div className={styles.sideText}>
          {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
        </div>
        <div className={styles.sideCol}>
          <SideBox label="PRAZO DE ENTREGA" rows={rows} />
          <p className={styles.importante}>
            <strong>Importante:</strong> os prazos serão contabilizados a partir da data
            disponível para início indicada nesta proposta.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Cartão de uma parcela — número/rótulo, valor, vencimento e
// pílula inferior (estática na entrada, contagem regressiva nas demais). ──
function ParcelaCard({
  number,
  label,
  valor,
  valorExtenso,
  vencimento,
  isEntrada,
  highlight,
}: {
  number?: string;
  label: string;
  valor: string;
  valorExtenso?: string;
  vencimento: string;
  isEntrada?: boolean;
  highlight?: boolean;
}) {
  const countdown = useCountdownTo(isEntrada ? undefined : endDateOf(vencimento));
  return (
    <div className={`${styles.parcelCard} ${highlight ? styles.parcelEntrada : ""}`}>
      {number && <span className={styles.parcelNum}>{number}</span>}
      <span className={styles.parcelTag}>{label}</span>
      <span className={styles.parcelValue}>{valor}</span>
      {valorExtenso && <span className={styles.payExtenso}>{valorExtenso}</span>}
      <div className={styles.parcelDivider} aria-hidden />
      <span className={styles.parcelVencLabel}>VENCIMENTO</span>
      <span className={styles.parcelVenc}>{vencimento}</span>
      <span className={styles.parcelPill}>
        <span className={styles.parcelPillDot} aria-hidden />
        {isEntrada ? "VALOR DA ENTRADA" : (countdown ?? "")}
      </span>
    </div>
  );
}

// ── Seção 06 — variantes ───────────────────────────────────────
function SixPagamento({ doc }: { doc: ContractDoc }) {
  const p = doc.sixPagamento;
  if (!p) return null;
  return (
    <div className={styles.sixWrap}>
      <div className={styles.payCard}>
        <div className={styles.payCardLeft}>
          <span className={styles.payCardIcon}><IconWallet /></span>
          <div>
            <span className={styles.payTotalLabel}>VALOR TOTAL DO CONTRATO</span>
            <span className={styles.payTotalValue}>{p.valorTotal}</span>
            {p.valorTotalExtenso && <span className={styles.payExtenso}>{p.valorTotalExtenso}</span>}
          </div>
        </div>
        <span className={styles.payCardDivider} aria-hidden />
        <div className={styles.payCardRight}>
          <span className={styles.payTotalLabel}>RESUMO DO PAGAMENTO</span>
          <ul className={styles.payResumo}>
            {p.resumo.map((r, i) => {
              const isLast = i === p.resumo.length - 1;
              return (
                <li key={i}>
                  <span className={`${styles.payResumoIcon} ${isLast ? styles.payResumoIconCream : ""}`}>
                    {isLast ? <IconPercent /> : <IconCheck />}
                  </span>
                  {r}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className={styles.parcelGrid}>
        {p.entrada && (
          <ParcelaCard
            label="VALOR DA ENTRADA"
            valor={p.entrada.valor}
            valorExtenso={p.entrada.valorExtenso}
            vencimento={p.entrada.vencimento}
            isEntrada
            highlight
          />
        )}
        {p.parcelas.map((row) => (
          <ParcelaCard
            key={row.number}
            number={row.number}
            label={row.label}
            valor={row.valor}
            valorExtenso={row.valorExtenso}
            vencimento={row.vencimento}
          />
        ))}
      </div>
    </div>
  );
}

function SixTabelaCustos({ doc }: { doc: ContractDoc }) {
  const t = doc.sixTabelaCustos;
  if (!t) return null;
  return (
    <div className={styles.sixWrap}>
      {t.intro && <p className={styles.clauseP}>{t.intro}</p>}
      {t.tabelas.map((tab, i) => {
        const cols = tab.colunas ?? ["SERVIÇO", "DESCRIÇÃO", "VALOR UNITÁRIO"];
        return (
          <div key={i} className={styles.costTable}>
            <span className={styles.costTableTitle}>{tab.titulo}</span>
            {tab.nota && <p className={styles.costNote}>{tab.nota}</p>}
            <table className={styles.costGrid}>
              <thead>
                <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {tab.linhas.map((ln, j) => (
                  <tr key={j}>
                    <td className={styles.costServico}>{ln.servico}</td>
                    {cols.length >= 3 && <td>{ln.descricao}</td>}
                    <td className={styles.costValor}>
                      {ln.valor.split("\n").map((v, k) => <div key={k}>{v}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {t.observacoes && t.observacoes.length > 0 && (
        <div className={styles.costObs}>
          <span className={styles.costObsTitle}>Observações Gerais</span>
          <ul className={styles.clauseList}>
            {t.observacoes.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section06({ doc }: { doc: ContractDoc }) {
  const isCustos = doc.sixVariant === "tabela-custos";
  return (
    <SectionCard tab={isCustos ? "TABELA DE CUSTOS DOS SERVIÇOS" : "VALOR E PAGAMENTO"}>
      <ClauseHead number="06" title={isCustos ? "TABELA DE CUSTOS DOS SERVIÇOS" : "DO VALOR E DA FORMA DE PAGAMENTO"} />
      {isCustos ? <SixTabelaCustos doc={doc} /> : <SixPagamento doc={doc} />}
    </SectionCard>
  );
}

// ── Card PIX (dentro da cláusula 07) ───────────────────────────
function PixCard({ doc }: { doc: ContractDoc }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(doc.pix.chave).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className={styles.pixWrap}>
      <span className={styles.pixBullet}>• VIA PIX</span>
      <div className={styles.pixCard}>
        <div className={styles.pixMain}>
          <span className={styles.pixIcon}><IconPix /></span>
          <div className={styles.pixKeyBlock}>
            <span className={styles.pixLabel}>{doc.pix.chaveLabel}</span>
            <div className={styles.pixKeyRow}>
              <span className={styles.pixValue}>{doc.pix.chave}</span>
              <button className={styles.pixCopy} onClick={copy}>
                {copied ? <IconCheck /> : <IconCopy />}
                {copied ? "COPIADO" : "COPIAR"}
              </button>
            </div>
          </div>
        </div>
        <span className={styles.pixDivider} aria-hidden />
        <div className={styles.pixTitular}>
          <span className={styles.pixLabel}>TITULAR</span>
          <span className={styles.pixValue}>{doc.pix.titular}</span>
        </div>
      </div>
      {doc.pix.lembrete && (
        <div className={styles.pixNote}>
          <span className={styles.pixNoteIcon}><IconInfo /></span>
          <p>{doc.pix.lembrete}</p>
        </div>
      )}
    </div>
  );
}

// ── Cláusula 07 (pagamento) — PIX entre 7.1 e 7.2 ──────────────
function PagamentoCard({ clause, doc }: { clause: ContractClause; doc: ContractDoc }) {
  const [first, ...rest] = clause.blocks;
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title}>
      <ClauseHead number={clause.number} title={clause.title} />
      {first && <Block block={first} />}
      <PixCard doc={doc} />
      {rest.map((b, i) => <Block key={i} block={b} />)}
    </SectionCard>
  );
}

// ── Cláusula 11 (arquivos) — 2 colunas ─────────────────────────
function ArquivosCard({ clause, doc }: { clause: ContractClause; doc: ContractDoc }) {
  const icons = [<IconCalendar key="c" />, <IconX key="x" />, <IconFolder key="f" />];
  const rows: SideRow[] = doc.arquivosCards.map((c, i) => ({
    icon: icons[i] ?? <IconFolder key={`f${i}`} />,
    // só o ícone do "APÓS ESSE PRAZO" ganha borda vermelha; os demais ficam escuros (iguais).
    iconMod: i === 1 ? styles.sideIconRedOutline : "",
    title: c.label,
    caption: c.value,
  }));
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title}>
      <ClauseHead number={clause.number} title={clause.title} />
      <div className={styles.sideGrid}>
        <div className={styles.sideText}>
          {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
        </div>
        <div className={styles.sideCol}>
          <SideBox label="ARQUIVOS DIGITAIS" rows={rows} iconsLg />
          <p className={styles.importante}>
            <strong>Importante:</strong> o reenvio após esse prazo será mera liberalidade,
            não gerando obrigação de armazenamento permanente.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Cláusula 17 (incapacidade) — 2 colunas, borda vermelha ─────
const INCAPACIDADE_NOTES = [
  { icon: <IconWarning />, mod: styles.sideIconRedOutline, title: "COMUNICAÇÃO", text: "A CONTRATADA informará imediatamente o CONTRATANTE sobre qualquer impedimento que afete a execução dos serviços." },
  { icon: <IconPeople />, mod: "", title: "", text: "As partes manterão o diálogo aberto para minimizar impactos e garantir a continuidade do projeto." },
];
function IncapacidadeCard({ clause }: { clause: ContractClause }) {
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title} cardBorderVariant="pink">
      <ClauseHead number={clause.number} title={clause.title} />
      <div className={styles.sideGrid}>
        <div className={styles.sideText}>
          {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
        </div>
        <div className={styles.sideBox}>
          {INCAPACIDADE_NOTES.map((n, i) => (
            <div key={i} className={styles.noteItem}>
              <div className={styles.noteHead}>
                <span className={`${styles.sideIcon} ${n.mod || ""}`}>{n.icon}</span>
                {n.title && <span className={styles.noteTitle}>{n.title}</span>}
              </div>
              <p className={styles.noteText}>{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ── Cláusula 18 (validade) — 2 colunas, borda verde ─────────────
function ValidadeCard({ clause, doc }: { clause: ContractClause; doc: ContractDoc }) {
  // Editável pelo admin (cláusula 18); fallback p/ o padrão em contratos antigos.
  const cards = doc.validadeCards?.length ? doc.validadeCards : DEFAULT_VALIDADE_CARDS;
  const last = cards.length - 1;
  const rows: SideRow[] = cards.map((c, i) => ({
    // VIGÊNCIA = calendário; INÍCIO = ampulheta; TÉRMINO (último) = check verde com borda.
    icon: i === last ? <IconCheck /> : i === 0 ? <IconCalendar /> : <IconHourglass />,
    iconMod: i === last ? styles.sideIconGreenOutline : "",
    title: c.value,
    caption: c.label,
    capTop: true,
    small: true,
  }));
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title} tabVariant="green" cardBorderVariant="green">
      <ClauseHead number={clause.number} title={clause.title} />
      <div className={styles.sideGrid}>
        <div className={styles.sideText}>
          {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
        </div>
        <div className={styles.sideCol}>
          <SideBox rows={rows} />
        </div>
      </div>
    </SectionCard>
  );
}

// ── Cartão de status de uma parte no bloco de assinatura ───────
function SigPartyCard({
  isContratante,
  name,
  role,
  doc,
  pendingLabel,
}: {
  isContratante: boolean;
  name: string;
  role: string;
  doc: ContractDoc;
  pendingLabel: string;
}) {
  const printing = useContext(PrintContext);
  const signed = doc.signature.status === "assinado";
  return (
    <div className={styles.sigPartyCard}>
      <span className={`${styles.partyTag} ${isContratante ? styles.partyTagContratante : styles.partyTagContratada}`}>{isContratante ? "CONTRATANTE" : "CONTRATADA"}</span>
      <h4 className={styles.sigPartyCardName}>{name}</h4>
      <span className={styles.partyRole}>{role}</span>

      {isContratante ? (
        signed ? (
          <>
            <span className={`${styles.sigPartyStatus} ${styles.sigPartyStatusDone}`}>
              ASSINADO EM {doc.signature.assinadoEm ?? doc.date}
            </span>
            <div className={styles.sigPartySuccess}>
              <span><IconCheck /> Assinatura realizada com sucesso!</span>
              {doc.signature.ip && <span className={styles.sigPartyIp}>IP: {doc.signature.ip}</span>}
            </div>
          </>
        ) : (
          <>
            <span className={`${styles.sigPartyStatus} ${styles.sigPartyStatusPending}`}>{pendingLabel}</span>
            {!printing && (
              doc.autentiqueUrl ? (
                <a className={styles.assinarBtn} href={doc.autentiqueUrl} target="_blank" rel="noopener noreferrer">
                  ASSINAR O CONTRATO
                </a>
              ) : (
                <span className={styles.sigPending}>Link de assinatura em breve</span>
              )
            )}
            <span className={styles.assinarCaption}><IconLockSm /> assinatura 100% online e segura</span>
          </>
        )
      ) : (
        <>
          <span className={`${styles.sigPartyStatus} ${styles.sigPartyStatusDone}`}>ASSINATURA CONFIRMADA</span>
          <div className={styles.sigPartySuccess}>
            <span><IconCheck /> Assinatura da contratada confirmada</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Cartão de ação do rodapé (baixar PDF / dúvidas) ────────────
function FooterActionCard({
  icon,
  title,
  caption,
  action,
  mirror = false,
}: {
  icon: ReactNode;
  title: string;
  caption: string;
  action: ReactNode;
  /** Espelha o padrão de borda (segundo card da dupla). */
  mirror?: boolean;
}) {
  return (
    <div className={`${styles.footerCard} ${mirror ? styles.footerCardMirror : ""}`}>
      <span className={styles.footerCardIcon}>{icon}</span>
      <div className={styles.footerCardText}>
        <span className={styles.footerCardTitle}>{title}</span>
        <span className={styles.footerCardCaption}>{caption}</span>
      </div>
      {action}
    </div>
  );
}

// ── Conteúdo do bloco de assinatura (reutilizado na cláusula 19 do contrato
//    principal e na seção de assinatura do termo aditivo). ──────────
function SignatureInner({ doc }: { doc: ContractDoc }) {
  const legal = doc.signature.validadeLegal;
  // Divide no primeiro "." seguido de espaço + maiúscula (fim de frase real) —
  // evita cortar em pontos de números como "2.200-2/2001" ou "14.063/2020".
  const legalMatch = legal.match(/^(.*?\.)\s+(?=[A-ZÀ-Ý])([\s\S]*)$/);
  const miniNote = legalMatch ? legalMatch[1] : null;
  const mainText = legalMatch ? legalMatch[2] : legal;
  const pendingLabel = doc.signature.status === "aguardando" ? "AGUARDANDO ASSINATURA DO CLIENTE" : STATUS_LABEL[doc.signature.status];
  const city = doc.contratada.endereco.split("-")[0]?.trim() || "Goiânia";
  return (
    <>
      <p className={styles.clauseP}><strong className={styles.clauseNumInline}>Autorizo</strong> a execução dos serviços descritos acima:</p>

      <div className={styles.digitalBox}>
        <div className={styles.digitalBoxMain}>
          <span className={styles.digitalBoxIcon}><IconLock /></span>
          <div>
            <span className={styles.digitalBoxLabel}>ASSINATURA DIGITAL</span>
            <p className={styles.digitalBoxText}>{mainText}</p>
          </div>
        </div>
        <div className={styles.digitalBoxSide}>
          <span className={styles.digitalBadge}><IconCheck /> SEGURO E VÁLIDO</span>
          {miniNote && <span className={styles.digitalMiniNote}><IconCheck /> {miniNote}</span>}
        </div>
      </div>

      <span className={styles.blockLabel}>STATUS DA ASSINATURA</span>
      <span className={`${styles.statusPill} ${doc.signature.status === "assinado" ? styles.statusSigned : ""}`}>
        <span className={styles.statusDot} aria-hidden /> {pendingLabel}
      </span>
      <p className={styles.signDate}>{city}, <strong>{formatDateExtenso(doc.date)}</strong></p>

      <div className={styles.sigParties}>
        <SigPartyCard isContratante name={doc.signature.contratante.name} role={doc.signature.contratante.role} doc={doc} pendingLabel={pendingLabel} />
        <SigPartyCard isContratante={false} name={doc.signature.contratada.name} role={doc.signature.contratada.role} doc={doc} pendingLabel={pendingLabel} />
      </div>
    </>
  );
}

// Cards de ação do rodapé (baixar PDF / dúvidas) — some na impressão.
function FooterActions({ onPrint, waLink }: { onPrint: () => void; waLink: string }) {
  return (
    <>
      <FooterActionCard
        mirror
        icon={<IconDownload />}
        title="BAIXAR CONTRATO EM PDF"
        caption="Tenha uma cópia deste contrato em PDF."
        action={<button className={styles.pdfBtn} onClick={onPrint}><IconDownload /> BAIXAR PDF</button>}
      />
      <FooterActionCard
        icon={<IconQuestion />}
        title="DÚVIDAS?"
        caption="Fale conosco pelo WhatsApp e teremos prazer em ajudar."
        action={<a className={styles.waBtn} href={waLink} target="_blank" rel="noopener noreferrer"><IconWhatsApp /> FALAR NO WHATSAPP</a>}
      />
    </>
  );
}

// ── Cláusula 19 (foro) + bloco de assinatura completo ──────────
function ForoAssinaturaCard({
  clause,
  doc,
  onPrint,
  waLink,
}: {
  clause: ContractClause;
  doc: ContractDoc;
  onPrint: () => void;
  waLink: string;
}) {
  const printing = useContext(PrintContext);
  return (
    <>
      <SectionCard tab={clause.eyebrow ?? clause.title}>
        <ClauseHead number={clause.number} title={clause.title} />
        {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
        <SignatureInner doc={doc} />
      </SectionCard>
      {!printing && <FooterActions onPrint={onPrint} waLink={waLink} />}
    </>
  );
}

// ── Cláusula do TERMO ADITIVO (texto simples; a cláusula 03 embute o pagamento). ──
function AditivoClauseCard({ clause, doc }: { clause: ContractClause; doc: ContractDoc }) {
  return (
    <SectionCard tab={clause.eyebrow ?? clause.title}>
      <ClauseHead number={clause.number} title={clause.title} />
      {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
      {clause.number === "03" && doc.sixPagamento && <SixPagamento doc={doc} />}
    </SectionCard>
  );
}

// ── Dispatcher de cláusula ─────────────────────────────────────
function ClauseCard({
  clause,
  doc,
  onPrint,
  waLink,
}: {
  clause: ContractClause;
  doc: ContractDoc;
  onPrint: () => void;
  waLink: string;
}) {
  switch (clause.number) {
    case "02": return <EscopoCard clause={clause} doc={doc} />;
    case "05": return <PrazoCard clause={clause} doc={doc} />;
    case "07": return <PagamentoCard clause={clause} doc={doc} />;
    case "11": return <ArquivosCard clause={clause} doc={doc} />;
    case "17": return <IncapacidadeCard clause={clause} />;
    case "18": return <ValidadeCard clause={clause} doc={doc} />;
    case "19": return <ForoAssinaturaCard clause={clause} doc={doc} onPrint={onPrint} waLink={waLink} />;
    default: {
      const pink = clause.number === "12" || clause.number === "15";
      return (
        <SectionCard
          tab={clause.eyebrow ?? clause.title}
          tabVariant={pink ? "pink" : "dark"}
          cardBorderVariant={pink ? "pink" : undefined}
        >
          <ClauseHead number={clause.number} title={clause.title} />
          {clause.blocks.map((b, i) => <Block key={i} block={b} />)}
        </SectionCard>
      );
    }
  }
}

// ── Componente principal ───────────────────────────────────────
export default function ContractView({ doc, pdfMode = false, preview = false }: { doc: ContractDoc; pdfMode?: boolean; preview?: boolean }) {
  // pdfMode (URL ?pdf=1): renderiza tudo visível para o Browser Rendering
  // capturar o PDF no servidor — SEM abrir o diálogo de impressão do navegador.
  const [printing, setPrinting] = useState(pdfMode);
  const [exporting, setExporting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // pdfMode (?pdf=1 → Browser Rendering do Autentique): sinaliza pronto p/ captura.
    if (pdfMode) {
      (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => {
        document.documentElement.setAttribute("data-pdf-ready", "1");
      }) ?? document.documentElement.setAttribute("data-pdf-ready", "1");
    }
  }, [pdfMode]);

  // "Baixar PDF" do cliente: gera no navegador (1 clique baixa), sem diálogo.
  const exportPdf = async () => {
    if (exporting || pdfMode) return;
    setExporting(true);
    setPrinting(true);
    await waitForRenderReady();
    try {
      if (pageRef.current) {
        await exportElementToPdf(pageRef.current, `Contrato-${doc.contractNumber || doc.clientName || "documento"}`, { background: "#ffffff" });
      }
    } catch {
      window.print();
    } finally {
      setPrinting(false);
      setExporting(false);
    }
  };

  const waLink = `https://wa.me/${doc.contact.whatsapp}`;
  const signed = doc.signature.status === "assinado";

  return (
    <PrintContext.Provider value={printing || preview}>
      <div className={`${styles.page} ${preview ? styles.pagePreview : ""}`} ref={pageRef}>
        {!printing && !preview && <CustomCursor />}
        <div className={styles.sheet}>
          {/* ── Cabeçalho ── */}
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.logoBox}>
                <img src="/assets/logo-parasite.webp" alt="Isabela Paulino Studio" className={styles.logoImg} />
              </div>
              {!printing && !preview && (
                <button className={styles.pdfBtn} onClick={exportPdf} disabled={exporting}>
                  <IconDownload /> {exporting ? "GERANDO…" : "BAIXAR PDF"}
                </button>
              )}
            </div>

            <div className={styles.headerBody}>
              <span className={styles.docEyebrow}>
                {doc.kind === "aditivo" ? "CONTRATO ADITIVO" : `CONTRATO DE ${doc.serviceTitle}`} · Nº {doc.contractNumber}
              </span>
              {doc.projectName && (
                <h1 className={styles.docTitleProject}>{doc.projectName}</h1>
              )}
              <h1 className={styles.docTitle}>{doc.documentTitle}</h1>
              {doc.tags && doc.tags.length > 0 && (
                <div className={styles.tags}>
                  {doc.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              )}
            </div>

            <DiamondDivider />

            <div className={styles.headerMeta}>
              <div className={styles.metaItem}><span className={styles.metaLabel}>CLIENTE</span><span className={styles.metaValue}>{doc.clientName}</span></div>
              <div className={styles.metaItem}><span className={styles.metaLabel}>PROJETO</span><span className={styles.metaValue}>{doc.projectName}</span></div>
              <div className={styles.metaItem}><span className={styles.metaLabel}>DATA</span><span className={styles.metaValue}>{doc.date}</span></div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>STATUS</span>
                <span className={`${styles.statusPill} ${signed ? styles.statusSigned : ""}`}>
                  <span className={styles.statusDot} aria-hidden /> {STATUS_LABEL[doc.signature.status]}
                </span>
              </div>
            </div>

            <DiamondDivider />

            <span className={styles.headerFootnote}>ISABELA PAULINO STUDIO · TODOS OS DIREITOS RESERVADOS</span>
          </header>

          {/* ── Partes ── */}
          <Reveal>
            <section className={styles.section}>
              <SectionCard tab="AS PARTES IDENTIFICADAS" bare className={styles.partiesCard}>
                <div className={styles.partiesGrid}>
                  <PartyCard party={doc.contratante} />
                  <PartyCard party={doc.contratada} />
                </div>
                {doc.objetoIntro[0] && <InfoBox>{doc.objetoIntro[0]}</InfoBox>}
              </SectionCard>
            </section>
          </Reveal>

          {doc.kind === "aditivo" ? (
            /* ── TERMO ADITIVO: 6 cláusulas (pagamento na 03) + assinatura ── */
            <>
              {doc.clauses.map((clause) => (
                <Reveal className={styles.section} key={clause.number}>
                  <AditivoClauseCard clause={clause} doc={doc} />
                </Reveal>
              ))}
              <Reveal className={styles.section}>
                <SectionCard tab="ASSINATURA">
                  <SignatureInner doc={doc} />
                </SectionCard>
              </Reveal>
              {!printing && <FooterActions onPrint={exportPdf} waLink={waLink} />}
            </>
          ) : (
            /* ── Contrato principal (+ Seção 06 após a 05; assinatura na 19) ── */
            doc.clauses.map((clause) => (
              <Fragment key={clause.number}>
                <Reveal className={styles.section}>
                  <ClauseCard clause={clause} doc={doc} onPrint={exportPdf} waLink={waLink} />
                </Reveal>
                {clause.number === "05" && (
                  <Reveal className={styles.section}>
                    <Section06 doc={doc} />
                  </Reveal>
                )}
              </Fragment>
            ))
          )}

          <footer className={styles.footer}>ISABELA PAULINO STUDIO · TODOS OS DIREITOS RESERVADOS</footer>
        </div>
      </div>
    </PrintContext.Provider>
  );
}
