import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type CostItem } from "../api";
import { toast } from "../toast";
import { confirmDialog } from "../confirmDialog";
import styles from "../Admin.module.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtBRL = (n: number) => BRL.format(n || 0);
// Margem % sobre o preço de venda; "—" quando não dá para calcular.
function margin(item: CostItem): { pct: number | null; color: string } {
  if (!item.price) return { pct: null, color: "var(--color-text-muted)" };
  const pct = ((item.price - item.cost) / item.price) * 100;
  const color = pct < 0 ? "#f0506e" : pct < 20 ? "#d9a531" : "#40c261";
  return { pct, color };
}

interface FormState {
  name: string; category: string; unit: string; cost: string; price: string; notes: string;
}
const EMPTY: FormState = { name: "", category: "", unit: "", cost: "", price: "", notes: "" };

export default function TabelaCustos() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const { items } = await api.listCostItems(); setItems(items); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Erro ao carregar."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) if (i.category) set.add(i.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return items.filter((i) => {
      if (catFilter && (i.category || "") !== catFilter) return false;
      if (nq && !(`${i.name} ${i.category ?? ""} ${i.unit ?? ""}`.toLowerCase().includes(nq))) return false;
      return true;
    });
  }, [items, q, catFilter]);

  // Agrupa por categoria (sem categoria vai por último).
  const grouped = useMemo(() => {
    const map = new Map<string, CostItem[]>();
    for (const i of filtered) {
      const key = i.category || "Sem categoria";
      const arr = map.get(key) ?? []; arr.push(i); map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === "Sem categoria" ? 1 : b[0] === "Sem categoria" ? -1 : a[0].localeCompare(b[0]));
  }, [filtered]);

  const totals = useMemo(() => {
    const active = items.filter((i) => i.active);
    const margins = active.map((i) => margin(i).pct).filter((p): p is number => p != null);
    const avg = margins.length ? margins.reduce((s, p) => s + p, 0) / margins.length : null;
    return { count: items.length, active: active.length, avgMargin: avg };
  }, [items]);

  const openNew = () => { setEditId(null); setForm(EMPTY); setShowForm(true); };
  const startEdit = (i: CostItem) => {
    setEditId(i.id);
    setForm({ name: i.name, category: i.category ?? "", unit: i.unit ?? "", cost: String(i.cost || ""), price: String(i.price || ""), notes: i.notes ?? "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancel = () => { setShowForm(false); setEditId(null); setForm(EMPTY); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      unit: form.unit.trim() || null,
      cost: Number(form.cost.replace(",", ".")) || 0,
      price: Number(form.price.replace(",", ".")) || 0,
      notes: form.notes.trim() || null,
    };
    try {
      if (editId) {
        await api.updateCostItem(editId, payload);
        setItems((prev) => prev.map((i) => (i.id === editId ? { ...i, ...payload } : i)));
        toast("Item atualizado.", { type: "success" });
      } else {
        const { item } = await api.createCostItem(payload);
        setItems((prev) => [...prev, item]);
        toast("Item adicionado.", { type: "success" });
      }
      cancel();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  const toggleActive = async (i: CostItem) => {
    const next = !i.active;
    setItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, active: next } : x)));
    try { await api.updateCostItem(i.id, { active: next }); }
    catch { load(); }
  };
  const remove = async (i: CostItem) => {
    if (!(await confirmDialog({ message: `Excluir "${i.name}" da tabela de custos?`, confirmLabel: "Excluir", danger: true }))) return;
    setBusy(i.id);
    try { await api.deleteCostItem(i.id); setItems((prev) => prev.filter((x) => x.id !== i.id)); if (editId === i.id) cancel(); }
    catch (err) { toast(err instanceof ApiError ? err.message : "Erro ao excluir."); }
    finally { setBusy(null); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Tabela de custos</div>
          <div className={styles.pageHint}>Catálogo de serviços e itens do estúdio, com custo, preço e margem.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input className={styles.input} style={{ width: "auto", minWidth: 190 }} placeholder="🔍 Buscar item, categoria…" value={q} onChange={(e) => setQ(e.target.value)} />
          {categories.length > 0 && (
            <select className={styles.input} style={{ width: "auto", minWidth: 130 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">Todas categorias</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNew}>+ Novo item</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Resumo */}
      {!loading && items.length > 0 && (
        <div className={styles.costSummary}>
          <div className={styles.costStat}><span className={styles.costStatVal}>{totals.count}</span><span className={styles.costStatLbl}>itens no catálogo</span></div>
          <div className={styles.costStat}><span className={styles.costStatVal}>{totals.active}</span><span className={styles.costStatLbl}>ativos</span></div>
          <div className={styles.costStat}>
            <span className={styles.costStatVal}>{totals.avgMargin != null ? `${totals.avgMargin.toFixed(0)}%` : "—"}</span>
            <span className={styles.costStatLbl}>margem média</span>
          </div>
        </div>
      )}

      {/* Formulário novo / edição */}
      {showForm && (
        <form className={styles.card} onSubmit={submit} style={{ marginBottom: 16 }}>
          <div className={styles.cardTitle}>{editId ? "Editar item" : "Novo item"}</div>
          <div className={styles.costForm}>
            <label className={styles.costField} style={{ flex: "2 1 220px" }}>
              <span className={styles.costLabel}>Serviço / item</span>
              <input className={styles.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Projeto de interiores" autoFocus />
            </label>
            <label className={styles.costField} style={{ flex: "1 1 150px" }}>
              <span className={styles.costLabel}>Categoria</span>
              <input className={styles.input} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ex.: Projetos" list="cost-cats" />
              <datalist id="cost-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className={styles.costField} style={{ flex: "0 1 110px" }}>
              <span className={styles.costLabel}>Unidade</span>
              <input className={styles.input} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="m² · un · h" list="cost-units" />
              <datalist id="cost-units"><option value="m²" /><option value="un" /><option value="hora" /><option value="projeto" /><option value="diária" /><option value="mês" /></datalist>
            </label>
            <label className={styles.costField} style={{ flex: "0 1 130px" }}>
              <span className={styles.costLabel}>Custo (R$)</span>
              <input className={styles.input} value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} inputMode="decimal" placeholder="0,00" />
            </label>
            <label className={styles.costField} style={{ flex: "0 1 130px" }}>
              <span className={styles.costLabel}>Preço (R$)</span>
              <input className={styles.input} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} inputMode="decimal" placeholder="0,00" />
            </label>
            <label className={styles.costField} style={{ flex: "2 1 100%" }}>
              <span className={styles.costLabel}>Observação (opcional)</span>
              <input className={styles.input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Detalhe, condição, o que inclui…" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando…" : editId ? "Salvar" : "Adicionar ao catálogo"}
            </button>
            <button type="button" className={styles.btnGhost} onClick={cancel}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum item no catálogo ainda. Clique em <strong>"+ Novo item"</strong> para começar.</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Nenhum item para esse filtro.</div>
      ) : (
        grouped.map(([cat, arr]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div className={styles.taskGroupHead}>{cat} <span style={{ opacity: 0.5 }}>· {arr.length}</span></div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Serviço / item</th>
                    <th>Unidade</th>
                    <th style={{ textAlign: "right" }}>Custo</th>
                    <th style={{ textAlign: "right" }}>Preço</th>
                    <th style={{ textAlign: "right" }}>Margem</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {arr.map((i) => {
                    const m = margin(i);
                    return (
                      <tr key={i.id} style={{ opacity: (busy === i.id || !i.active) ? 0.55 : 1 }}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ color: "var(--color-text-primary)" }}>{i.name}{!i.active && <span className={styles.taskChip} style={{ marginLeft: 8 }}>inativo</span>}</span>
                            {i.notes && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{i.notes}</span>}
                          </div>
                        </td>
                        <td style={{ color: "var(--color-text-muted)" }}>{i.unit || "—"}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(i.cost)}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{fmtBRL(i.price)}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: m.color }}>{m.pct != null ? `${m.pct.toFixed(0)}%` : "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <div className={styles.rowActions} style={{ justifyContent: "flex-end" }}>
                            <button className={styles.btnGhost} onClick={() => toggleActive(i)} title={i.active ? "Desativar" : "Ativar"}>{i.active ? "Desativar" : "Ativar"}</button>
                            <button className={styles.btnGhost} onClick={() => startEdit(i)}>Editar</button>
                            <button className={styles.btnGhost} onClick={() => remove(i)} disabled={busy === i.id}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
