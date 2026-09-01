import { useEffect, useRef, useState } from "react";
import { uploadBriefingFile, briefingQuota, formatBytes } from "./bigUpload";
import styles from "./BriefingView.module.css";

// ── "NO SISTEMA": o cliente manda a maquete direto por aqui ──────────────
// Terceira opção da pergunta de maquete (além de e-mail e WhatsApp). Sobe na
// hora (não espera o envio do briefing), em pedaços, para aguentar arquivos
// grandes. O que chega vira anexo da pergunta e aparece em Arquivos, na pasta
// do cliente — é lá que a Isabela apaga quando o projeto termina.

const IconMonitor = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const IconCloud = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6.5 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a3.75 3.75 0 0 1-.25 8.5H6.5Z" />
    <path d="M12 15V9M9.5 11.5 12 9l2.5 2.5" />
  </svg>
);

type Job = { id: string; name: string; size: number; pct: number; error?: string; done?: boolean };

export default function SystemUploadCard({
  briefingNumber,
  disabled,
  onUploaded,
}: {
  briefingNumber: string;
  /** briefing bloqueado / modo leitura → só mostra o card, sem enviar. */
  disabled?: boolean;
  onUploaded: (url: string, name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const [quota, setQuota] = useState<{ used: number; quota: number; remaining: number } | null>(null);

  const loadQuota = () => { void briefingQuota(briefingNumber).then(setQuota); };
  useEffect(loadQuota, [briefingNumber]);

  const send = async (files: File[]) => {
    if (disabled || !files.length) return;
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setJobs((prev) => [...prev, { id, name: file.name, size: file.size, pct: 0 }]);
      try {
        const { url, name } = await uploadBriefingFile(briefingNumber, file, (f) =>
          setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, pct: Math.round(f * 100) } : j)))
        );
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, pct: 100, done: true } : j)));
        onUploaded(url, name);
      } catch (e) {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, error: e instanceof Error ? e.message : "Falhou ao enviar." } : j))
        );
      }
    }
    loadQuota();
  };

  return (
    <div className={styles.sysCard}>
      <div className={styles.sysHead}>
        <span className={styles.sysIcon}><IconMonitor /></span>
        <span className={styles.maqueteCardTitle}>NO SISTEMA</span>
        <span className={styles.sysBadge}>NOVO</span>
      </div>
      <span className={styles.maqueteCardText}>Envie seus arquivos direto no sistema, sem e-mail nem WhatsApp.</span>

      <button
        type="button"
        className={`${styles.sysDrop} ${over ? styles.sysDropOver : ""}`}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void send(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <span className={styles.sysDropIcon}><IconCloud /></span>
        <span className={styles.sysDropText}>
          {disabled ? "Envio encerrado para este briefing." : "Clique para selecionar ou arraste e solte aqui"}
        </span>
        <span className={styles.sysDropHint}>
          Vários arquivos · até <strong>1 GB no total</strong>
          {quota ? ` · restam ${formatBytes(quota.remaining)}` : ""}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className={styles.refHidden}
        onChange={(e) => {
          void send(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {jobs.length > 0 && (
        <ul className={styles.sysList}>
          {jobs.map((j) => (
            <li key={j.id} className={styles.sysItem}>
              <span className={styles.sysItemName} title={j.name}>{j.name}</span>
              <span className={styles.sysItemMeta}>
                {j.error ? j.error : j.done ? `enviado · ${formatBytes(j.size)}` : `${j.pct}%`}
              </span>
              <span className={styles.sysBar}>
                <span
                  className={`${styles.sysBarFill} ${j.error ? styles.sysBarError : ""}`}
                  style={{ width: `${j.error ? 100 : j.pct}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <span className={styles.sysNote}>
        Arquivo muito grande? O envio é feito em partes — deixe a página aberta até terminar.
      </span>
    </div>
  );
}
