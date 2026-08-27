import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type Task, type TaskPriority, type TaskStatus, type ContractSummary } from "../api";
import { toast } from "../toast";
import { confirmDialog } from "../confirmDialog";
import styles from "../Admin.module.css";

// Prioridades e status com cores do design system (vermelho/âmbar/cinza/verde).
const PRIO: Record<TaskPriority, { label: string; color: string }> = {
  alta:   { label: "Alta",   color: "#f0506e" },
  normal: { label: "Normal", color: "#9aa6b8" },
  baixa:  { label: "Baixa",  color: "#6b7280" },
};
const STATUS_TABS: [TaskStatus | "todas", string][] = [
  ["todas", "Todas"],
  ["aberta", "Abertas"],
  ["fazendo", "Fazendo"],
  ["concluida", "Concluídas"],
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDue(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
// Grupo de urgência de uma tarefa aberta (para agrupar a lista).
function urgencyGroup(t: Task, today: string): "atrasada" | "hoje" | "embreve" | "semdata" {
  if (!t.dueDate) return "semdata";
  if (t.dueDate < today) return "atrasada";
  if (t.dueDate === today) return "hoje";
  return "embreve";
}
const GROUP_META: Record<string, { label: string; color: string }> = {
  atrasada: { label: "Atrasadas", color: "#f0506e" },
  hoje:     { label: "Hoje", color: "#d9a531" },
  embreve:  { label: "Em breve", color: "#9aa6b8" },
  semdata:  { label: "Sem data", color: "#6b7280" },
};
const GROUP_ORDER = ["atrasada", "hoje", "embreve", "semdata"];

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<TaskStatus | "todas">("todas");

  // Formulário (novo / edição). editId = id em edição, ou null p/ novo.
  const [editId, setEditId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fPriority, setFPriority] = useState<TaskPriority>("normal");
  const [fDue, setFDue] = useState("");
  const [fContract, setFContract] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const today = todayKey();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ tasks }, { contracts }] = await Promise.all([api.listTasks(), api.listContracts()]);
      setTasks(tasks);
      setContracts(contracts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Rótulo de um projeto (contrato) pelo id.
  const contractLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contracts) map.set(c.id, c.projectName || c.title || c.proposalTitle || `Contrato ${c.contractNumber ?? ""}`.trim());
    return map;
  }, [contracts]);

  const counts = useMemo(() => {
    let aberta = 0, fazendo = 0, concluida = 0;
    for (const t of tasks) {
      if (t.status === "concluida") concluida++;
      else if (t.status === "fazendo") fazendo++;
      else aberta++;
    }
    return { todas: tasks.length, aberta, fazendo, concluida };
  }, [tasks]);

  const resetForm = () => {
    setEditId(null); setFTitle(""); setFPriority("normal"); setFDue(""); setFContract(""); setFNotes("");
  };
  const startEdit = (t: Task) => {
    setEditId(t.id); setFTitle(t.title); setFPriority(t.priority);
    setFDue(t.dueDate || ""); setFContract(t.contractId || ""); setFNotes(t.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim()) return;
    setSaving(true);
    const payload = {
      title: fTitle.trim(),
      priority: fPriority,
      dueDate: fDue || null,
      contractId: fContract || null,
      notes: fNotes.trim() || null,
    };
    try {
      if (editId) {
        await api.updateTask(editId, payload);
        setTasks((prev) => prev.map((t) => (t.id === editId ? { ...t, ...payload, dueDate: payload.dueDate } : t)));
        toast("Tarefa atualizada.", { type: "success" });
      } else {
        const { task } = await api.createTask(payload);
        setTasks((prev) => [task, ...prev]);
        toast("Tarefa criada.", { type: "success" });
      }
      resetForm();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  // Ciclo do check: aberta → concluida → aberta.
  const toggleDone = async (t: Task) => {
    const next: TaskStatus = t.status === "concluida" ? "aberta" : "concluida";
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try { await api.updateTask(t.id, { status: next }); }
    catch { load(); }
  };
  // Alterna "fazendo" (só quando não concluída).
  const toggleDoing = async (t: Task) => {
    if (t.status === "concluida") return;
    const next: TaskStatus = t.status === "fazendo" ? "aberta" : "fazendo";
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try { await api.updateTask(t.id, { status: next }); }
    catch { load(); }
  };
  const remove = async (t: Task) => {
    if (!(await confirmDialog({ message: `Excluir a tarefa "${t.title}"?`, confirmLabel: "Excluir", danger: true }))) return;
    setBusy(t.id);
    try { await api.deleteTask(t.id); setTasks((prev) => prev.filter((x) => x.id !== t.id)); if (editId === t.id) resetForm(); }
    catch (err) { toast(err instanceof ApiError ? err.message : "Erro ao excluir."); }
    finally { setBusy(null); }
  };

  // Filtro por aba.
  const filtered = useMemo(() => {
    if (tab === "todas") return tasks;
    return tasks.filter((t) => t.status === tab);
  }, [tasks, tab]);

  // Agrupa por urgência (só faz sentido p/ tarefas não concluídas; concluídas vão num grupo à parte).
  const groups = useMemo(() => {
    const open = filtered.filter((t) => t.status !== "concluida");
    const done = filtered.filter((t) => t.status === "concluida");
    const byGroup = new Map<string, Task[]>();
    for (const t of open) {
      const g = urgencyGroup(t, today);
      const arr = byGroup.get(g) ?? []; arr.push(t); byGroup.set(g, arr);
    }
    // Ordena cada grupo por data (asc) e prioridade.
    const prioRank: Record<TaskPriority, number> = { alta: 0, normal: 1, baixa: 2 };
    for (const arr of byGroup.values()) {
      arr.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || prioRank[a.priority] - prioRank[b.priority]);
    }
    return { byGroup, done };
  }, [filtered, today]);

  const row = (t: Task) => {
    const prio = PRIO[t.priority];
    const done = t.status === "concluida";
    const overdue = !done && t.dueDate && t.dueDate < today;
    const proj = t.contractId ? contractLabel.get(t.contractId) : null;
    return (
      <div key={t.id} className={styles.taskRow} style={{ opacity: busy === t.id ? 0.5 : 1 }}>
        <button
          type="button"
          className={`${styles.taskCheck} ${done ? styles.taskCheckDone : ""}`}
          onClick={() => toggleDone(t)}
          title={done ? "Reabrir tarefa" : "Concluir tarefa"}
          aria-label={done ? "Reabrir" : "Concluir"}
        >✓</button>

        <span className={styles.taskPrioDot} style={{ background: prio.color }} title={`Prioridade: ${prio.label}`} />

        <div className={styles.taskBody}>
          <div className={`${styles.taskTitle} ${done ? styles.taskTitleDone : ""}`}>{t.title}</div>
          <div className={styles.taskMeta}>
            {t.status === "fazendo" && <span className={styles.taskChip} style={{ color: "#d9a531", borderColor: "#d9a53155" }}>Fazendo</span>}
            {t.dueDate && (
              <span className={styles.taskChip} style={{ color: overdue ? "#f0506e" : "var(--color-text-muted)", borderColor: overdue ? "#f0506e55" : "var(--color-border)" }}>
                {overdue ? "⚠ " : "📅 "}{fmtDue(t.dueDate)}
              </span>
            )}
            {proj && <span className={styles.taskChip} title="Projeto vinculado">🗂 {proj}</span>}
            {t.notes && <span className={styles.taskNote}>{t.notes}</span>}
          </div>
        </div>

        <div className={styles.taskActions}>
          {!done && (
            <button className={styles.btnGhost} onClick={() => toggleDoing(t)} title="Marcar como 'fazendo'">
              {t.status === "fazendo" ? "Pausar" : "Fazendo"}
            </button>
          )}
          <button className={styles.btnGhost} onClick={() => startEdit(t)}>Editar</button>
          <button className={styles.btnGhost} onClick={() => remove(t)} disabled={busy === t.id}>Excluir</button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Tarefas</div>
          <div className={styles.pageHint}>Organize o que precisa ser feito. Tarefas com data aparecem também no Calendário.</div>
        </div>
        <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Formulário novo / edição */}
      <form className={styles.taskForm} onSubmit={submit}>
        <input
          className={styles.input}
          placeholder="O que precisa ser feito?"
          value={fTitle}
          onChange={(e) => setFTitle(e.target.value)}
          style={{ flex: "2 1 220px" }}
        />
        <select className={styles.input} value={fPriority} onChange={(e) => setFPriority(e.target.value as TaskPriority)} style={{ flex: "0 1 130px" }} title="Prioridade">
          <option value="alta">🔴 Alta</option>
          <option value="normal">⚪ Normal</option>
          <option value="baixa">⚫ Baixa</option>
        </select>
        <input className={styles.input} type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} style={{ flex: "0 1 150px" }} title="Prazo (opcional)" />
        <select className={styles.input} value={fContract} onChange={(e) => setFContract(e.target.value)} style={{ flex: "1 1 180px" }} title="Vincular a um projeto (opcional)">
          <option value="">Sem projeto</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>{c.projectName || c.title || c.clientName || "Contrato"}</option>
          ))}
        </select>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !fTitle.trim()}>
          {saving ? "Salvando…" : editId ? "Salvar" : "+ Adicionar"}
        </button>
        {editId && <button type="button" className={styles.btnGhost} onClick={resetForm}>Cancelar</button>}
      </form>

      {/* Abas por status */}
      {!loading && tasks.length > 0 && (
        <div className={styles.tabs}>
          {STATUS_TABS.map(([id, label]) => (
            <button key={id} className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`} onClick={() => setTab(id)}>
              {label} <span style={{ opacity: 0.6 }}>· {counts[id as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : tasks.length === 0 ? (
        <div className={styles.empty}>Nenhuma tarefa ainda. Adicione a primeira acima.</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {/* Tarefas abertas agrupadas por urgência */}
          {tab !== "concluida" && GROUP_ORDER.map((g) => {
            const arr = groups.byGroup.get(g);
            if (!arr || arr.length === 0) return null;
            const meta = GROUP_META[g];
            return (
              <div key={g} className={styles.taskGroup}>
                <div className={styles.taskGroupHead}>
                  <span className={styles.taskGroupDot} style={{ background: meta.color }} />
                  {meta.label} <span style={{ opacity: 0.5 }}>· {arr.length}</span>
                </div>
                {arr.map(row)}
              </div>
            );
          })}

          {/* Concluídas */}
          {tab !== "aberta" && tab !== "fazendo" && groups.done.length > 0 && (
            <div className={styles.taskGroup}>
              <div className={styles.taskGroupHead}>
                <span className={styles.taskGroupDot} style={{ background: "#40c261" }} />
                Concluídas <span style={{ opacity: 0.5 }}>· {groups.done.length}</span>
              </div>
              {groups.done.map(row)}
            </div>
          )}

          {filtered.length === 0 && (
            <div className={styles.empty}>Nenhuma tarefa neste filtro.</div>
          )}
        </div>
      )}
    </div>
  );
}
