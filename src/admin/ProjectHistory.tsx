import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type ProjectHistoryEntry } from "./api";
import { PROJECT_EVENT_TYPES, eventTypeMeta } from "../projectEvents";
import styles from "./Admin.module.css";

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => { try { return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR"); } catch { return iso; } };

type Draft = { date: string; type: string; description: string; phase: string; categories: string };
const emptyDraft = (): Draft => ({ date: today(), type: "reuniao", description: "", phase: "", categories: "" });
// "Marcenaria, 3D" → ["Marcenaria", "3D"]
const splitCats = (s: string | null | undefined) => (s || "").split(",").map((c) => c.trim()).filter(Boolean);

export default function ProjectHistory({ contractId, projectLabel, clientName, signed, onBack }: {
  contractId: string;
  projectLabel: string;
  clientName: string;
  signed: boolean;
  onBack: () => void;
}) {
  const [items, setItems] = useState<ProjectHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const { history } = await api.listProjectHistory(contractId); setItems(history); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao carregar."); }
    finally { setLoading(false); }
  }, [contractId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!draft.description.trim()) { setError("Descreva o que aconteceu."); return; }
    setBusy(true); setError(null);
    try {
      const payload = { date: draft.date, type: draft.type, description: draft.description.trim(), phase: draft.phase.trim(), categories: draft.categories.trim() };
      if (editId) await api.updateProjectHistory(contractId, editId, payload);
      else await api.addProjectHistory(contractId, payload);
      setDraft(emptyDraft()); setEditId(null);
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao salvar."); }
    finally { setBusy(false); }
  };

  const startEdit = (h: ProjectHistoryEntry) => {
    setEditId(h.id);
    setDraft({ date: h.date, type: h.type, description: h.description, phase: h.phase ?? "", categories: h.categories ?? "" });
  };
  const cancelEdit = () => { setEditId(null); setDraft(emptyDraft()); };

  const remove = async (h: ProjectHistoryEntry) => {
    if (!confirm("Excluir este registro do histórico?")) return;
    setBusy(true);
    try { await api.deleteProjectHistory(contractId, h.id); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao excluir."); }
    finally { setBusy(false); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Histórico do projeto</div>
          <div className={styles.pageHint}>{projectLabel} · {clientName}</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
      </div>

      {!signed && (
        <div className={styles.notice} style={{ marginBottom: 14 }}>
          O contrato ainda não está assinado. Você pode registrar o histórico, mas ele só aparece na Área do Cliente <strong>após a assinatura</strong>.
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}

      {/* Formulário de registro */}
      <div className={styles.card} style={{ marginBottom: 18 }}>
        <div className={styles.cardTitle}>{editId ? "Editar registro" : "Novo registro"}</div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Data</label>
            <input type="date" className={styles.input} value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Tipo do evento</label>
            <select className={styles.input} value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
              {PROJECT_EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Descrição (o que aconteceu)</label>
          <textarea className={styles.input} rows={3} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Ex.: Reunião de alinhamento — definidos os ambientes e o estilo." />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Status / fase (opcional)</label>
            <input className={styles.input} value={draft.phase} onChange={(e) => setDraft((d) => ({ ...d, phase: e.target.value }))} placeholder="Ex.: Anteprojeto, Detalhamento, Entrega final…" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Categorias (separe por vírgula)</label>
            <input className={styles.input} value={draft.categories} onChange={(e) => setDraft((d) => ({ ...d, categories: e.target.value }))} placeholder="Ex.: Marcenaria, 3D, Iluminação" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={busy}>{editId ? "Salvar alterações" : "+ Adicionar ao histórico"}</button>
          {editId && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelEdit} disabled={busy}>Cancelar</button>}
        </div>
        {/* Legenda de cores */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          {PROJECT_EVENT_TYPES.map((t) => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--color-text-muted)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />{t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum registro ainda. Adicione o primeiro acima.</div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 8 }}>
          {items.map((h) => {
            const meta = eventTypeMeta(h.type);
            return (
              <div key={h.id} style={{ display: "flex", gap: 14, paddingBottom: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: 3, boxShadow: `0 0 0 4px ${meta.color}22` }} />
                  <span style={{ flex: 1, width: 2, background: "var(--color-border)", marginTop: 4 }} />
                </div>
                <div style={{ flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{meta.label}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtDate(h.date)}</span>
                    {h.phase && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--color-border)", color: "var(--color-text-secondary)" }}>{h.phase}</span>}
                    <span style={{ flex: 1 }} />
                    <button className={styles.btn} style={{ padding: "3px 9px", fontSize: 12 }} onClick={() => startEdit(h)}>Editar</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: "3px 9px", fontSize: 12 }} onClick={() => remove(h)} disabled={busy}>Excluir</button>
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--color-text-primary)", marginTop: 6, whiteSpace: "pre-wrap" }}>{h.description}</div>
                  {splitCats(h.categories).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {splitCats(h.categories).map((cat, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: `${meta.color}1e`, color: meta.color, border: `1px solid ${meta.color}44` }}>{cat}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
