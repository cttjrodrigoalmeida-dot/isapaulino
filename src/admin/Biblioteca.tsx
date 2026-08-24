import { useEffect, useState, useCallback, useRef } from "react";
import {
  api,
  ApiError,
  type LibraryQuestion,
  type LibraryBlock,
  type LibraryPortfolioItem,
  type LibraryNote,
  type ContractSummary,
} from "./api";
import type { BriefingQuestion } from "../components/briefing/types";
import type { InvestmentBlock } from "../components/proposal/types";
import { toast } from "./toast";
import { confirmDialog } from "./confirmDialog";
import UploadHint from "./UploadHint";
import styles from "./Admin.module.css";

// Página central da BIBLIOTECA: reúne, em abas, tudo o que o estúdio reaproveita
// (imagens de portfólio, perguntas de briefing, blocos de proposta e notas). O
// conteúdo é salvo uma única vez aqui e reutilizado em qualquer documento.

type Tab = "imagens" | "perguntas" | "blocos" | "notas";
const TABS: { id: Tab; label: string }[] = [
  { id: "imagens", label: "Imagens" },
  { id: "perguntas", label: "Perguntas" },
  { id: "blocos", label: "Blocos" },
  { id: "notas", label: "Notas" },
];

// ── Resumos curtos p/ preview (mesma lógica dos pickers) ──
const Q_TYPE_LABEL: Record<string, string> = {
  longtext: "Texto longo", text: "Texto curto", number: "Número", date: "Data",
  yesno: "Sim/Não", radio: "Escolha única", checklist: "Lista selecionável",
  multicheck: "Múltipla escolha", select: "Seleção", maquete: "Maquete", arquivo: "Arquivo",
};
function questionMeta(q: BriefingQuestion): string {
  const parts = [Q_TYPE_LABEL[q.type ?? "longtext"] ?? "Texto longo"];
  if (q.options?.length) parts.push(`${q.options.length} opções`);
  return parts.join(" · ");
}
function blockSummary(b: InvestmentBlock): string {
  const normais = (b.lines ?? []).filter((l) => !l.brinde).length;
  const brindes = (b.lines ?? []).filter((l) => l.brinde).length;
  const parts = [`${normais} ${normais === 1 ? "item" : "itens"}`];
  if (brindes) parts.push(`${brindes} brinde${brindes === 1 ? "" : "s"}`);
  if (b.subtotal) parts.push(b.subtotal);
  return parts.join(" · ");
}

export default function Biblioteca() {
  const [tab, setTab] = useState<Tab>("imagens");
  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Biblioteca</div>
          <div className={styles.pageHint}>
            Conteúdos reutilizáveis do estúdio — salve uma vez e reaproveite em qualquer proposta ou briefing, sem duplicar arquivos.
          </div>
        </div>
      </div>

      <div className={styles.tabs} style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "imagens" && <ImagensTab />}
      {tab === "perguntas" && <PerguntasTab />}
      {tab === "blocos" && <BlocosTab />}
      {tab === "notas" && <NotasTab />}
    </div>
  );
}

/* ════════════════════ IMAGENS (portfólio) ════════════════════ */
function ImagensTab() {
  const [items, setItems] = useState<LibraryPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tag, setTag] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCap, setEditCap] = useState("");
  const [editTag, setEditTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { items } = await api.listPortfolioLibrary(); setItems(items); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao carregar imagens.", { type: "error" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await api.uploadImage(file);
        await api.addToPortfolioLibrary(url, "", tag.trim());
      }
      toast(`${files.length} imagem${files.length === 1 ? "" : "s"} enviada${files.length === 1 ? "" : "s"} à biblioteca.`, { type: "success" });
      await load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao enviar.", { type: "error" }); }
    finally { setUploading(false); }
  };

  const startEdit = (it: LibraryPortfolioItem) => { setEditId(it.id); setEditCap(it.caption); setEditTag(it.clientTag ?? ""); };
  const commitEdit = async () => {
    if (!editId) return;
    const id = editId; setEditId(null);
    try { await api.updatePortfolioLibraryItem(id, editCap.trim(), editTag.trim()); await load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao salvar.", { type: "error" }); }
  };
  const remove = async (it: LibraryPortfolioItem) => {
    if (!(await confirmDialog({ title: "Remover imagem", message: "Remover esta imagem da biblioteca? As propostas que já a usam não são afetadas." }))) return;
    try { await api.deletePortfolioLibraryItem(it.id); setItems((p) => p.filter((x) => x.id !== it.id)); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao remover.", { type: "error" }); }
  };

  // Agrupa por cliente/projeto (tag). Sem tag → "Sem cliente".
  const groups = new Map<string, LibraryPortfolioItem[]>();
  for (const it of items) {
    const key = (it.clientTag ?? "").trim() || "— Sem cliente";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => (a === "— Sem cliente" ? 1 : b === "— Sem cliente" ? -1 : a.localeCompare(b)));

  return (
    <div>
      <div className={styles.card} style={{ marginBottom: 18 }}>
        <div className={styles.cardTitle}>Enviar imagens</div>
        <p className={styles.pageHint} style={{ marginTop: 2 }}>
          Suba as imagens uma única vez. Ao montar uma proposta, use <strong>☆ Biblioteca</strong> no portfólio e selecione as que fazem sentido — o mesmo arquivo é reaproveitado (não duplica o armazenamento).
        </p>
        <div className={styles.field} style={{ maxWidth: 360 }}>
          <label className={styles.label}>Cliente / projeto (opcional — para agrupar)</label>
          <input className={styles.input} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: Ap. Maria Clara, Escritório XYZ…" />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Enviando…" : "⬆ Enviar imagens"}
          </button>
          <span className={styles.pageHint} style={{ margin: 0 }}>{items.length} na biblioteca</span>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files && e.target.files.length) upload(e.target.files); e.target.value = ""; }} />
        </div>
        <div style={{ marginTop: 12 }}><UploadHint /></div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma imagem ainda. Envie a primeira acima.</div>
      ) : (
        groupKeys.map((key) => (
          <div key={key} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{key}</span>
              <span className={styles.pageHint} style={{ margin: 0 }}>· {groups.get(key)!.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {groups.get(key)!.map((it) => (
                <div key={it.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden", background: "var(--color-surface-2)" }}>
                  <div style={{ aspectRatio: "4 / 3", overflow: "hidden", background: "var(--color-surface)" }}>
                    <img src={it.image} alt={it.caption || "Portfólio"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {editId === it.id ? (
                      <>
                        <input className={styles.input} autoFocus value={editCap} onChange={(e) => setEditCap(e.target.value)} placeholder="Legenda (opcional)" style={{ fontSize: 12.5 }} />
                        <input className={styles.input} value={editTag} onChange={(e) => setEditTag(e.target.value)} placeholder="Cliente / projeto" style={{ fontSize: 12.5 }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={commitEdit} style={{ padding: "4px 10px" }}>Salvar</button>
                          <button type="button" className={styles.btn} onClick={() => setEditId(null)} style={{ padding: "4px 10px" }}>Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12.5, color: it.caption ? "var(--color-text-primary)" : "var(--color-text-muted)", minHeight: 18, lineHeight: 1.4, wordBreak: "break-word" }}>
                          {it.caption || "Sem legenda"}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className={styles.btn} title="Editar legenda e cliente" onClick={() => startEdit(it)} style={{ padding: "4px 10px" }}>✎</button>
                          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} style={{ marginLeft: "auto", padding: "4px 10px" }} title="Remover da biblioteca" onClick={() => remove(it)}>✕</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ════════════════════ PERGUNTAS (briefing) ════════════════════ */
function PerguntasTab() {
  const [items, setItems] = useState<LibraryQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const { items } = await api.listQuestionLibrary(); setItems(items); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao carregar.", { type: "error" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rename = async () => {
    if (!editId) return;
    const id = editId, label = editLabel.trim(); setEditId(null);
    if (!label) return;
    try { await api.renameLibraryQuestion(id, label); await load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao renomear.", { type: "error" }); }
  };
  const remove = async (it: LibraryQuestion) => {
    if (!(await confirmDialog({ title: "Excluir pergunta", message: `Excluir "${it.label}" da biblioteca?` }))) return;
    try { await api.deleteLibraryQuestion(it.id); setItems((p) => p.filter((x) => x.id !== it.id)); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao excluir.", { type: "error" }); }
  };

  return (
    <LibraryList
      loading={loading}
      empty="Nenhuma pergunta salva ainda. No editor de briefing, use ☆ na barra da pergunta para salvar aqui."
      hint="Perguntas de briefing reutilizáveis. Para inserir numa seção, use ☆ Biblioteca no editor de briefing."
      rows={items.map((it) => ({
        id: it.id, label: it.label, meta: questionMeta(it.question), preview: it.question.text || "",
        editing: editId === it.id, editValue: editLabel,
      }))}
      onStartEdit={(id) => { const it = items.find((x) => x.id === id); if (it) { setEditId(id); setEditLabel(it.label); } }}
      onEditChange={setEditLabel}
      onCommitEdit={rename}
      onCancelEdit={() => setEditId(null)}
      onDelete={(id) => { const it = items.find((x) => x.id === id); if (it) remove(it); }}
    />
  );
}

/* ════════════════════ BLOCOS (proposta) ════════════════════ */
function BlocosTab() {
  const [items, setItems] = useState<LibraryBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const { items } = await api.listBlockLibrary(); setItems(items); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao carregar.", { type: "error" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rename = async () => {
    if (!editId) return;
    const id = editId, label = editLabel.trim(); setEditId(null);
    if (!label) return;
    try { await api.renameLibraryBlock(id, label); await load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao renomear.", { type: "error" }); }
  };
  const remove = async (it: LibraryBlock) => {
    if (!(await confirmDialog({ title: "Excluir bloco", message: `Excluir "${it.label}" da biblioteca?` }))) return;
    try { await api.deleteLibraryBlock(it.id); setItems((p) => p.filter((x) => x.id !== it.id)); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao excluir.", { type: "error" }); }
  };

  return (
    <LibraryList
      loading={loading}
      empty="Nenhum bloco salvo ainda. No editor de investimento da proposta, use ☆ Salvar para guardar um bloco aqui."
      hint="Blocos de investimento reutilizáveis. Para inserir numa proposta, use ☆ Biblioteca no editor de investimento."
      rows={items.map((it) => ({
        id: it.id, label: it.label, meta: blockSummary(it.block),
        preview: it.block.title && it.block.title !== it.label ? it.block.title : "",
        editing: editId === it.id, editValue: editLabel,
      }))}
      onStartEdit={(id) => { const it = items.find((x) => x.id === id); if (it) { setEditId(id); setEditLabel(it.label); } }}
      onEditChange={setEditLabel}
      onCommitEdit={rename}
      onCancelEdit={() => setEditId(null)}
      onDelete={(id) => { const it = items.find((x) => x.id === id); if (it) remove(it); }}
    />
  );
}

/* ── Lista genérica (perguntas/blocos): label + preview + renomear + excluir ── */
function LibraryList({ loading, empty, hint, rows, onStartEdit, onEditChange, onCommitEdit, onCancelEdit, onDelete }: {
  loading: boolean;
  empty: string;
  hint: string;
  rows: { id: string; label: string; meta: string; preview: string; editing: boolean; editValue: string }[];
  onStartEdit: (id: string) => void;
  onEditChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}) {
  if (loading) return <div className={styles.loading}>Carregando…</div>;
  return (
    <div>
      <p className={styles.pageHint} style={{ marginTop: 0 }}>{hint}</p>
      {rows.length === 0 ? (
        <div className={styles.empty}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} className={styles.card} style={{ padding: "12px 14px" }}>
              {r.editing ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input className={styles.input} autoFocus value={r.editValue} onChange={(e) => onEditChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") onCommitEdit(); if (e.key === "Escape") onCancelEdit(); }}
                    style={{ maxWidth: 320 }} />
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onCommitEdit} style={{ padding: "5px 12px" }}>Salvar</button>
                  <button className={styles.btn} onClick={onCancelEdit} style={{ padding: "5px 12px" }}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>{r.label}</div>
                    <div className={styles.pageHint} style={{ margin: "3px 0 0" }}>{r.meta}</div>
                    {r.preview && <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.4 }}>{r.preview}</div>}
                  </div>
                  <button className={styles.btn} onClick={() => onStartEdit(r.id)} style={{ padding: "5px 11px" }}>✎ Renomear</button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(r.id)} style={{ padding: "5px 11px" }}>Excluir</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════ NOTAS ════════════════════ */
const projLabel = (c: ContractSummary) => (c.projectName || c.title || c.proposalTitle || "Projeto").trim();
const projOptionLabel = (c: ContractSummary) => {
  const nome = projLabel(c);
  const cli = (c.clientName || "").trim();
  const num = (c.contractNumber || "").trim();
  return `${cli ? cli + " — " : ""}${nome}${num ? ` (Nº ${num})` : ""}`;
};

function NotasTab() {
  const [items, setItems] = useState<LibraryNote[]>([]);
  const [projects, setProjects] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [project, setProject] = useState("");   // contractId escolhido no formulário
  const [filter, setFilter] = useState("");     // filtro da lista por projeto
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ items }, { contracts }] = await Promise.all([api.listNoteLibrary(), api.listContracts()]);
      setItems(items);
      setProjects(contracts.filter((c) => c.status !== "cancelled"));
    } catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao carregar notas.", { type: "error" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const labelFor = useCallback((contractId?: string) => {
    if (!contractId) return "";
    const c = projects.find((p) => p.id === contractId);
    return c ? projOptionLabel(c) : "Projeto";
  }, [projects]);

  const reset = () => { setEditId(null); setTitle(""); setBody(""); setProject(""); };
  const save = async () => {
    if (!title.trim() && !body.trim()) { toast("Escreva um título ou o conteúdo.", { type: "error" }); return; }
    setBusy(true);
    try {
      if (editId) await api.updateNote(editId, title.trim(), body, items.find((n) => n.id === editId)?.pinned ?? false, project);
      else await api.createNote(title.trim(), body, false, project);
      reset(); await load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao salvar.", { type: "error" }); }
    finally { setBusy(false); }
  };
  const startEdit = (n: LibraryNote) => { setEditId(n.id); setTitle(n.title); setBody(n.body); setProject(n.contractId ?? ""); };
  const togglePin = async (n: LibraryNote) => {
    try { await api.updateNote(n.id, n.title, n.body, !n.pinned); await load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao fixar.", { type: "error" }); }
  };
  const remove = async (n: LibraryNote) => {
    if (!(await confirmDialog({ title: "Excluir nota", message: `Excluir ${n.title ? `"${n.title}"` : "esta nota"}?` }))) return;
    try { await api.deleteNote(n.id); setItems((p) => p.filter((x) => x.id !== n.id)); if (editId === n.id) reset(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Erro ao excluir.", { type: "error" }); }
  };

  const shown = filter ? items.filter((n) => (n.contractId ?? "") === filter) : items;

  return (
    <div>
      <div className={styles.card} style={{ marginBottom: 18 }}>
        <div className={styles.cardTitle}>{editId ? "Editar nota" : "Nova nota"}</div>
        <div className={styles.field}>
          <label className={styles.label}>Título</label>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Texto padrão de follow-up" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Projeto do cliente (opcional)</label>
          <select className={styles.input} value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">— Sem projeto (nota geral) —</option>
            {projects.map((c) => <option key={c.id} value={c.id}>{projOptionLabel(c)}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Conteúdo</label>
          <textarea className={styles.input} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva a nota…" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={busy}>{editId ? "Salvar alterações" : "+ Adicionar nota"}</button>
          {editId && <button className={styles.btn} onClick={reset} disabled={busy}>Cancelar</button>}
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className={styles.field} style={{ maxWidth: 360, marginBottom: 14 }}>
          <label className={styles.label}>Filtrar por projeto</label>
          <select className={styles.input} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos os projetos</option>
            {projects.map((c) => <option key={c.id} value={c.id}>{projOptionLabel(c)}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma nota ainda. Crie a primeira acima.</div>
      ) : shown.length === 0 ? (
        <div className={styles.empty}>Nenhuma nota neste projeto.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {shown.map((n) => {
            const proj = labelFor(n.contractId);
            return (
              <div key={n.id} className={styles.card} style={{ padding: "12px 14px", borderColor: n.pinned ? "var(--color-accent)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)", flex: 1 }}>{n.title || "Sem título"}</div>
                  <button className={styles.btn} title={n.pinned ? "Desafixar" : "Fixar no topo"} onClick={() => togglePin(n)} style={{ padding: "3px 8px", opacity: n.pinned ? 1 : 0.6 }}>📌</button>
                </div>
                {proj && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 7, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: "var(--color-accent-soft, rgba(180,150,90,0.14))", color: "var(--color-accent)", border: "1px solid var(--color-accent)", maxWidth: "100%" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📁 {proj}</span>
                  </div>
                )}
                {n.body && <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{n.body}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button className={styles.btn} onClick={() => startEdit(n)} style={{ padding: "4px 10px" }}>✎ Editar</button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(n)} style={{ padding: "4px 10px", marginLeft: "auto" }}>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
