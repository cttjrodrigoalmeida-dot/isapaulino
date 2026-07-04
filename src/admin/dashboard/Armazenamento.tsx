import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type StorageUsage } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

// Limite de referência do plano gratuito do R2 (10 GB). Acima de ~80% mostramos
// alerta para a Isabela não estourar e evitar cobranças.
const LIMIT_GB = 10;
const LIMIT_BYTES = LIMIT_GB * 1024 * 1024 * 1024;

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: i === 0 ? 0 : 2 })} ${units[i]}`;
}

export default function Armazenamento() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backing, setBacking] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backups, setBackups] = useState<{ key: string; size: number; uploaded: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, b] = await Promise.all([api.storageUsage(), api.listBackups().catch(() => ({ backups: [] }))]);
      setUsage(u);
      setBackups(b.backups);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar o uso do armazenamento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doBackup = async () => {
    setBacking(true);
    setBackupMsg(null);
    try {
      await api.downloadBackup();
      setBackupMsg("Backup gerado e baixado com sucesso.");
    } catch (err) {
      setBackupMsg(err instanceof ApiError ? err.message : "Não foi possível gerar o backup.");
    } finally {
      setBacking(false);
    }
  };

  const pct = usage ? Math.min(100, (usage.totalBytes / LIMIT_BYTES) * 100) : 0;
  const warn = pct >= 80;
  const fillColor = warn ? "#e0683c" : "var(--color-accent)";

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Armazenamento</h1>
          <p className={s.greetSub}>
            Uso do Cloudflare R2 (imagens) e backup dos dados. Acompanhe para não exceder o limite gratuito.
          </p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>
          Atualizar
        </button>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      <div className={`${s.grid} ${s.cols3}`}>
        {/* Uso total — ocupa 2 colunas */}
        <div className={s.card} style={{ gridColumn: "span 2" }}>
          <div className={s.cardHead}>
            <div>
              <div className={s.cardTitleX}>Uso do R2</div>
              <div className={s.cardSub}>Cloudflare R2 · limite gratuito {LIMIT_GB} GB</div>
            </div>
          </div>

          {loading ? (
            <div className={s.emptyMini}>Carregando…</div>
          ) : usage ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span className={s.kpiValue}>{formatBytes(usage.totalBytes)}</span>
                <span className={s.kpiNote}>de {LIMIT_GB} GB · {usage.objectCount} arquivo{usage.objectCount === 1 ? "" : "s"}</span>
              </div>

              <div className={s.progressTrack}>
                <div className={s.progressFill} style={{ width: `${pct}%`, background: fillColor }} />
              </div>
              <div style={{ marginTop: 6 }}>
                <span className={s.kpiNote}>{pct.toFixed(1)}% usado</span>
                {warn && (
                  <span className={s.soonTag} style={{ marginLeft: 8, color: fillColor }}>
                    Atenção: perto do limite
                  </span>
                )}
              </div>

              {/* Quebra por tipo */}
              <div style={{ marginTop: 18 }}>
                {usage.byPrefix.map((p) => (
                  <div key={p.prefix || "outros"} className={s.progressRow}>
                    <span className={s.progressLabel}>{p.label}</span>
                    <div className={s.progressTrack}>
                      <div
                        className={s.progressFill}
                        style={{ width: usage.totalBytes ? `${(p.bytes / usage.totalBytes) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className={s.progressPct}>{formatBytes(p.bytes)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Backup */}
        <div className={s.card}>
          <div className={s.cardHead}>
            <div>
              <div className={s.cardTitleX}>Backup dos dados</div>
              <div className={s.cardSub}>Propostas, briefings, respostas e agenda</div>
            </div>
          </div>
          <p className={s.kpiNote} style={{ display: "block", marginBottom: 14 }}>
            Baixa um JSON com cópia de todos os dados (clientes, contratos, pagamentos, etc.).
            O sistema também faz um <strong>backup automático por dia</strong> (guardado no R2, abaixo).
          </p>
          <button
            className={`${admin.btn} ${admin.btnPrimary}`}
            onClick={doBackup}
            disabled={backing}
          >
            {backing ? "Gerando backup…" : "Fazer backup agora"}
          </button>
          {backupMsg && <div className={admin.notice} style={{ marginTop: 12 }}>{backupMsg}</div>}

          {backups.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className={s.cardSub} style={{ marginBottom: 8 }}>Backups automáticos ({backups.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {backups.slice(0, 10).map((b) => (
                  <div key={b.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span className={admin.mono}>{b.key.replace("backups/", "")}</span>
                    <a className={`${admin.btn} ${admin.btnGhost}`} href={api.backupDownloadUrl(b.key)} target="_blank" rel="noopener noreferrer">Baixar</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
