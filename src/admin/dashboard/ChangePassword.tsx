import { useState } from "react";
import { api, ApiError } from "../api";
import admin from "../Admin.module.css";
import s from "./Dashboard.module.css";

export default function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) {
      setError("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <form className={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className={s.modalTitle}>Alterar senha</h2>
        <p className={s.modalSub}>Informe a senha atual e a nova senha.</p>

        {error && <div className={admin.error}>{error}</div>}
        {done && <div className={admin.notice}>Senha alterada com sucesso.</div>}

        {!done && (
          <>
            <div className={admin.field}>
              <label className={admin.label}>Senha atual</label>
              <input className={admin.input} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus autoComplete="current-password" />
            </div>
            <div className={admin.field}>
              <label className={admin.label}>Nova senha</label>
              <input className={admin.input} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </div>
            <div className={admin.field}>
              <label className={admin.label}>Confirmar nova senha</label>
              <input className={admin.input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
          </>
        )}

        <div className={s.modalActions}>
          <button type="button" className={`${admin.btn} ${admin.btnGhost}`} onClick={onClose}>
            {done ? "Fechar" : "Cancelar"}
          </button>
          {!done && (
            <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={loading}>
              {loading ? "Salvando…" : "Salvar nova senha"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
