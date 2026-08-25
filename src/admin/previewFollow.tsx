// Preferência de ROLAGEM AUTOMÁTICA da prévia — compartilhada por todos os
// editores (proposta, contrato, briefing). A prévia acompanha (ou não) a seção
// que está sendo editada. Guardada em localStorage para lembrar a escolha entre
// sessões; a Isabela liga/desliga conforme o momento.
import styles from "./Admin.module.css";
import { useState } from "react";

const KEY = "ips_preview_follow";

/** Lê a preferência (default: LIGADO). */
export function readPreviewFollowPref(): boolean {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}

/** Hook: [ligado, setLigado] — persiste em localStorage. */
export function usePreviewFollowPref(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(readPreviewFollowPref);
  const setEnabled = (v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
  };
  return [enabled, setEnabled];
}

/** Interruptor visual (checkbox estilizado) — vai no cabeçalho do painel de prévia. */
export function PreviewFollowToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={styles.autosaveToggle}
      style={{ color: "var(--color-text-secondary)" }}
      title={
        enabled
          ? "Rolagem automática LIGADA — a prévia acompanha a seção que você está editando."
          : "Rolagem automática DESLIGADA — a prévia fica parada onde você deixou."
      }
    >
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.autosaveTrack}><span className={styles.autosaveThumb} /></span>
      <span>Acompanhar rolagem</span>
    </label>
  );
}
