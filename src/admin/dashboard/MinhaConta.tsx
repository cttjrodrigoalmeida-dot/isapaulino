import { useEffect, useState } from "react";
import { api, ApiError, type AdminUser } from "../api";
import admin from "../Admin.module.css";
import s from "./Dashboard.module.css";

// Modal "Minha conta": edita nome de exibição, login e (opcionalmente) senha.
export default function MinhaConta({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (u: AdminUser) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getProfile()
      .then((p) => { if (alive) { setName(p.name); setUsername(p.username); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!username.trim()) return setError("O usuário (login) não pode ficar vazio.");

    const changingPassword = next.length > 0 || confirm.length > 0;
    if (changingPassword) {
      if (next.length < 6) return setError("A nova senha precisa ter ao menos 6 caracteres.");
      if (next !== confirm) return setError("A confirmação não confere com a nova senha.");
      if (!current) return setError("Informe a senha atual para trocar a senha.");
    }

    setLoading(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        username: username.trim(),
        ...(changingPassword ? { currentPassword: current, newPassword: next } : {}),
      });
      onSaved({ username: res.username, name: res.name });
      setNotice("Conta atualizada com sucesso.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <form className={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className={s.modalTitle}>Minha conta</h2>
        <p className={s.modalSub}>Altere seu nome, login e senha.</p>

        {error && <div className={admin.error}>{error}</div>}
        {notice && <div className={admin.notice}>{notice}</div>}

        <div className={admin.field}>
          <label className={admin.label}>Nome de exibição</label>
          <input className={admin.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Isabela Paulino" autoFocus />
        </div>
        <div className={admin.field}>
          <label className={admin.label}>Usuário (login)</label>
          <input className={admin.input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>

        <p className={s.modalSub} style={{ marginTop: 6 }}>Trocar senha (opcional)</p>
        <div className={admin.field}>
          <label className={admin.label}>Senha atual</label>
          <input className={admin.input} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
        <div className={admin.row2}>
          <div className={admin.field}>
            <label className={admin.label}>Nova senha</label>
            <input className={admin.input} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div className={admin.field}>
            <label className={admin.label}>Confirmar</label>
            <input className={admin.input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>

        <div className={s.modalActions}>
          <button type="button" className={`${admin.btn} ${admin.btnGhost}`} onClick={onClose}>Fechar</button>
          <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={loading}>
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
