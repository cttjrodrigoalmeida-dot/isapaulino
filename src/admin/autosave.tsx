// Preferência de SALVAMENTO AUTOMÁTICO — compartilhada por todos os editores
// (proposta, contrato, briefing). Guardada em localStorage para lembrar a escolha
// entre sessões; a Isabela liga/desliga conforme o documento.
import styles from "./Admin.module.css";
import { useState } from "react";

const KEY = "ips_autosave_enabled";

/** Lê a preferência (default: LIGADO). */
export function readAutosavePref(): boolean {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}

/** Hook: [ligado, setLigado] — persiste em localStorage. */
export function useAutosavePref(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(readAutosavePref);
  const setEnabled = (v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
  };
  return [enabled, setEnabled];
}

/** Interruptor visual (checkbox estilizado) para a barra de ações do editor. */
export function AutosaveToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={styles.autosaveToggle}
      title={
        enabled
          ? "Salvamento automático LIGADO — suas edições são salvas sozinhas enquanto você trabalha."
          : "Salvamento automático DESLIGADO — lembre de clicar em Salvar para não perder o que editou."
      }
    >
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.autosaveTrack}><span className={styles.autosaveThumb} /></span>
      <span>Salvar automático</span>
    </label>
  );
}
