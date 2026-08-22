import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ClientSheetRow, type ClientPanoramaProject } from "./api";
import { formatBRL } from "./dashboard/format";
import { confirmDialog } from "./confirmDialog";
import styles from "./Admin.module.css";

// Colunas da planilha do cliente (na ordem pedida pela Isabela).
const COLS = [
  { key: "date", label: "DATA", w: 108 },
  { key: "description", label: "DESCRIÇÃO DO PROJETO", w: 200 },
  { key: "categories", label: "CATEGORIAS DE SERVIÇOS", w: 180 },
  { key: "unit", label: "UNIDADE", w: 92 },
  { key: "unitValue", label: "VALOR INICIAL/UN", w: 130 },
  { key: "discount", label: "DESCONTO", w: 108 },
  { key: "finalValue", label: "VALOR FINAL", w: 130 },
  { key: "status", label: "PENDENTE/GRATUITO", w: 150 },
  { key: "phase", label: "FASE", w: 132 },
] as const;
type ColKey = (typeof COLS)[number]["key"];

// Tons translúcidos (leem bem no claro e no escuro). "" = limpar.
const PALETTE = ["#4ade8033", "#b07a1633", "#f0506e33", "#8b5cf633", "#38bdf833", "#f472b633", "#a3e63533", "#fb923c33", "#7c869833"];
const STYLE_CLIP = "ips_sheet_style_clip"; // estilo copiado entre clientes (localStorage)

const STATUS_OPTS: { v: string; label: string }[] = [
  { v: "", label: "—" },
  { v: "pendente", label: "Pendente" },
  { v: "gratuito", label: "Gratuito" },
  { v: "pago", label: "Pago" },
];

// Colunas de valor que oferecem "criar cobrança".
const CHARGE_COLS = new Set<ColKey>(["unitValue", "finalValue"]);

// "R$ 3.000,00" → 3000 (aceita também "3000", "3.000,50").
function parseMoney(s: string): number {
  const cleaned = String(s || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
// "01/08/2026" → "2026-08-01" (ou undefined se não bater).
function brToISO(s: string): string | undefined {
  const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : undefined;
}

function newRow(partial?: Partial<ClientSheetRow>): ClientSheetRow {
  return {
    id: crypto.randomUUID(), projectId: null, date: "", description: "", categories: "",
    unit: "", unitValue: "", discount: "", finalValue: "", status: "", phase: "", cellColors: {},
    ...partial,
  };
}

function projPhase(p: ClientPanoramaProject): string {
  if (p.status === "cancelled") return "Cancelado";
  if (p.status === "signed") return "Contrato assinado";
  return "Em andamento";
}
function toBR(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return ""; }
}
function rowFromProject(p: ClientPanoramaProject): ClientSheetRow {
  return newRow({
    projectId: p.id,
    date: toBR(p.signedAt),
    description: p.projectName || p.title || (p.number ? `Nº ${p.number}` : "Projeto"),
    finalValue: p.value != null ? formatBRL(p.value) : "",
    phase: projPhase(p),
  });
}

export default function ClientSheet({ clientId, projects }: { clientId: string; projects: ClientPanoramaProject[] }) {
  const [rows, setRows] = useState<ClientSheetRow[]>([]);
  const [colColors, setColColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [paint, setPaint] = useState(false);
  const [paintColor, setPaintColor] = useState<string>(PALETTE[0]);
  // Desfazer: pilha de snapshots (rows/colColors são imutáveis, guardo a referência).
  const [history, setHistory] = useState<{ rows: ClientSheetRow[]; colColors: Record<string, string> }[]>([]);
  const lastEditRef = useRef<string | null>(null); // agrupa digitação numa mesma célula num único passo
  // Menu de cobrança na célula de valor.
  const [chargeMenu, setChargeMenu] = useState<{ row: ClientSheetRow; col: ColKey; label: string; x: number; y: number } | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getClientSheet(clientId)
      .then(({ sheet }) => {
        if (!alive) return;
        if (sheet && Array.isArray(sheet.rows)) {
          setRows(sheet.rows);
          setColColors(sheet.colColors || {});
        } else {
          setRows(projects.map(rowFromProject)); // 1ª vez: semeia dos projetos
          setColColors({});
        }
      })
      .catch(() => { if (alive) setRows(projects.map(rowFromProject)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const markDirty = () => { setDirty(true); setNotice(null); };
  // Guarda o estado atual na pilha de desfazer (máx. 60 passos).
  const pushSnapshot = () => setHistory((h) => [...h.slice(-59), { rows, colColors }]);
  // Passo estrutural (linha, cor, colar): sempre um snapshot novo.
  const snapStructural = () => { lastEditRef.current = null; pushSnapshot(); };
  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRows(prev.rows); setColColors(prev.colColors);
      setDirty(true); setNotice(null); lastEditRef.current = null;
      return h.slice(0, -1);
    });
  };

  const setCell = (rowId: string, key: ColKey, val: string) => {
    // Digitação contínua na MESMA célula = 1 passo de desfazer.
    const editKey = `${rowId}|${key}`;
    if (lastEditRef.current !== editKey) { pushSnapshot(); lastEditRef.current = editKey; }
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, [key]: val } : r)));
    markDirty();
  };
  const paintCell = (rowId: string, key: ColKey) => {
    snapStructural();
    setRows((rs) => rs.map((r) => {
      if (r.id !== rowId) return r;
      const cc = { ...(r.cellColors || {}) };
      if (!paintColor) delete cc[key]; else cc[key] = paintColor;
      return { ...r, cellColors: cc };
    }));
    markDirty();
  };
  const paintCol = (key: ColKey) => {
    snapStructural();
    setColColors((c) => { const n = { ...c }; if (!paintColor) delete n[key]; else n[key] = paintColor; return n; });
    markDirty();
  };

  const addRow = () => { snapStructural(); setRows((rs) => [...rs, newRow()]); markDirty(); };
  const pullProjects = () => {
    const have = new Set(rows.map((r) => r.projectId).filter(Boolean));
    const add = projects.filter((p) => !have.has(p.id)).map(rowFromProject);
    if (add.length === 0) { setNotice("Nenhum projeto novo para puxar."); return; }
    snapStructural();
    setRows((rs) => [...rs, ...add]);
    markDirty();
  };
  const delRow = async (rowId: string) => {
    if (!(await confirmDialog({ title: "Excluir linha", message: "Remover esta linha da planilha?", confirmLabel: "Excluir" }))) return;
    snapStructural();
    setRows((rs) => rs.filter((r) => r.id !== rowId));
    markDirty();
  };
  const save = async () => {
    setSaving(true); setNotice(null);
    try { await api.saveClientSheet(clientId, { rows, colColors }); setDirty(false); setNotice("Planilha salva."); }
    catch (e) { setNotice(e instanceof ApiError ? e.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  };
  const copyStyle = () => {
    try { localStorage.setItem(STYLE_CLIP, JSON.stringify(colColors)); } catch { /* ignore */ }
    setNotice("Estilo de cores copiado. Abra outro cliente e clique em “Colar estilo”.");
  };
  const pasteStyle = () => {
    try {
      const s = JSON.parse(localStorage.getItem(STYLE_CLIP) || "null");
      if (s && typeof s === "object") { snapStructural(); setColColors(s); markDirty(); setNotice("Estilo aplicado (lembre de Salvar)."); }
      else setNotice("Nenhum estilo copiado ainda.");
    } catch { setNotice("Nenhum estilo copiado ainda."); }
  };

  // Cria a cobrança (no sistema = lançamento no Histórico Financeiro; ASAAS =
  // gera a cobrança de verdade a partir desse lançamento). Usa o valor da célula.
  const doCharge = async (target: "system" | "asaas") => {
    if (!chargeMenu) return;
    const { row, col } = chargeMenu;
    const amount = parseMoney(row[col]);
    if (amount <= 0) { setNotice("Informe um valor válido na célula antes de cobrar."); setChargeMenu(null); return; }
    setCharging(true); setNotice(null);
    try {
      const { id } = await api.createClientHistory(clientId, {
        description: row.description?.trim() || `Planilha — ${chargeMenu.label}`,
        amount, kind: "adicional",
        contract_id: row.projectId || null,
        date: brToISO(row.date),
      });
      if (target === "asaas") {
        const r = await api.generateHistoryAsaas(clientId, id);
        setNotice(r.url ? `Cobrança ASAAS gerada: ${r.url}` : "Cobrança ASAAS gerada.");
      } else {
        setNotice("Cobrança criada no sistema (Histórico Financeiro).");
      }
      // Se a linha ainda não tinha status, marca como pendente.
      if (!row.status) setRows((rs) => rs.map((x) => (x.id === row.id ? { ...x, status: "pendente" } : x)));
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Erro ao criar cobrança.");
    } finally {
      setCharging(false); setChargeMenu(null);
    }
  };

  const cellBg = (r: ClientSheetRow, key: ColKey): string | undefined => r.cellColors?.[key] || colColors[key] || undefined;

  if (loading) return <div style={card}><div className={styles.loading}>Carregando planilha…</div></div>;

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "none", background: "transparent", color: "var(--color-text-primary)",
    font: "inherit", fontSize: 12.5, padding: "7px 8px", outline: "none",
    pointerEvents: paint ? "none" : "auto",
  };

  return (
    <div style={card}>
      {/* Barra de ferramentas */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Planilha do cliente</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Linhas nascem dos projetos; edite e adicione o que quiser.</div>
        </div>
        <span style={{ flex: 1 }} />
        <button className={styles.btn} onClick={undo} disabled={history.length === 0} title="Desfazer a última alteração">↩ Desfazer</button>
        <button className={styles.btn} onClick={addRow}>+ Linha</button>
        <button className={styles.btn} onClick={pullProjects} title="Adiciona linhas dos projetos ainda não listados">↻ Puxar projetos</button>
        <button className={`${styles.btn} ${paint ? styles.btnPrimary : ""}`} onClick={() => setPaint((p) => !p)} title="Ative e clique nas células ou nos cabeçalhos para pintar">🎨 Pintar</button>
        <button className={styles.btn} onClick={copyStyle} title="Copia as cores das colunas">Copiar estilo</button>
        <button className={styles.btn} onClick={pasteStyle} title="Aplica as cores copiadas de outro cliente">Colar estilo</button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving || !dirty}>
          {saving ? "Salvando…" : dirty ? "Salvar" : "Salvo"}
        </button>
      </div>

      {/* Paleta (modo pintar) */}
      {paint && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12, padding: "10px 12px", background: "var(--color-surface-2, rgba(128,128,128,0.06))", border: "1px dashed var(--color-border)", borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Cor:</span>
          {PALETTE.map((c) => (
            <button key={c} onClick={() => setPaintColor(c)} title="Selecionar cor"
              style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer",
                border: paintColor === c ? "2px solid var(--color-text-primary)" : "1px solid var(--color-border)" }} />
          ))}
          <button onClick={() => setPaintColor("")} title="Sem cor (apaga)"
            style={{ width: 22, height: 22, borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 12,
              border: paintColor === "" ? "2px solid var(--color-text-primary)" : "1px solid var(--color-border)" }}>✕</button>
          <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginLeft: 4 }}>Clique numa célula ou no cabeçalho de uma coluna para pintar.</span>
        </div>
      )}

      {notice && <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginBottom: 10 }}>{notice}</div>}

      <div className={styles.tableScroll}>
        <table className={styles.table} style={{ minWidth: 1200 }}>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={paint ? () => paintCol(c.key) : undefined}
                  style={{
                    minWidth: c.w, background: colColors[c.key] || undefined,
                    cursor: paint ? "pointer" : "default", fontSize: 10.5, whiteSpace: "nowrap",
                  }}
                  title={paint ? "Clique para pintar a coluna" : undefined}
                >{c.label}</th>
              ))}
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={COLS.length + 1} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 22 }}>Planilha vazia. Use “+ Linha” ou “↻ Puxar projetos”.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    onClick={paint ? () => paintCell(r.id, c.key) : undefined}
                    style={{ padding: 0, background: cellBg(r, c.key), cursor: paint ? "pointer" : "text" }}
                  >
                    {c.key === "status" ? (
                      <select
                        value={r.status}
                        onChange={(e) => setCell(r.id, "status", e.target.value)}
                        style={{ ...inputStyle, color: "var(--color-text-primary)", cursor: "pointer" }}
                        disabled={paint}
                      >
                        {STATUS_OPTS.map((o) => (
                          <option key={o.v} value={o.v} style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>{o.label}</option>
                        ))}
                      </select>
                    ) : CHARGE_COLS.has(c.key) ? (
                      <div style={{ position: "relative" }}>
                        <input
                          value={r[c.key]}
                          onChange={(e) => setCell(r.id, c.key, e.target.value)}
                          readOnly={paint}
                          style={{ ...inputStyle, paddingRight: paint ? 8 : 24 }}
                        />
                        {!paint && (
                          <button
                            title="Criar cobrança com este valor"
                            onClick={(e) => { e.stopPropagation(); setChargeMenu({ row: r, col: c.key, label: c.label, x: e.clientX, y: e.clientY }); }}
                            style={{ position: "absolute", right: 3, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, opacity: 0.5, lineHeight: 1, padding: 2 }}
                          >💲</button>
                        )}
                      </div>
                    ) : (
                      <input
                        value={r[c.key]}
                        onChange={(e) => setCell(r.id, c.key, e.target.value)}
                        readOnly={paint}
                        placeholder=""
                        style={inputStyle}
                      />
                    )}
                  </td>
                ))}
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                  <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: "3px 9px", fontSize: 12 }} onClick={() => delRow(r.id)} disabled={paint}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Menu de cobrança (célula de valor) */}
      {chargeMenu && (
        <>
          <div onClick={() => setChargeMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div style={{
            position: "fixed", left: Math.min(chargeMenu.x, window.innerWidth - 240), top: Math.min(chargeMenu.y, window.innerHeight - 140), zIndex: 61,
            background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
            boxShadow: "0 12px 34px rgba(0,0,0,0.32)", padding: 6, minWidth: 220,
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", padding: "4px 8px 6px" }}>
              Cobrança · {chargeMenu.label}: <strong style={{ color: "var(--color-text-secondary)" }}>{formatBRL(parseMoney(chargeMenu.row[chargeMenu.col]))}</strong>
            </div>
            <button onClick={() => doCharge("system")} disabled={charging} style={menuItem}>💼 Cobrança no sistema</button>
            <button onClick={() => doCharge("asaas")} disabled={charging} style={menuItem}>🔗 Cobrança no ASAAS</button>
            <button onClick={() => setChargeMenu(null)} disabled={charging} style={{ ...menuItem, color: "var(--color-text-muted)" }}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  );
}

const menuItem: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7,
  border: "none", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", fontSize: 13,
};

const card: React.CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 18 };
