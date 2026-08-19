import { useRef, useState } from "react";
import type { LibraryPortfolioItem } from "./api";
import UploadHint from "./UploadHint";
import styles from "./Admin.module.css";

// Modal da BIBLIOTECA DE PORTFÓLIO (D1):
//  • enviar imagens uma única vez para a biblioteca ("⬆ Enviar para a biblioteca");
//  • clicar numa imagem para inseri-la no portfólio da proposta atual
//    (reusa o MESMO arquivo do R2 → não duplica armazenamento);
//  • editar a legenda (✎) / remover da biblioteca (✕).
export default function PortfolioLibraryPicker({
  items,
  onInsert,
  onUpload,
  onRenameCaption,
  onDelete,
  onClose,
  uploading,
}: {
  items: LibraryPortfolioItem[];
  onInsert: (item: LibraryPortfolioItem) => void;
  onUpload: (files: FileList) => void;
  onRenameCaption: (id: string, caption: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCap, setEditCap] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const startEdit = (it: LibraryPortfolioItem) => { setEditId(it.id); setEditCap(it.caption); };
  const commitEdit = () => { if (editId) onRenameCaption(editId, editCap.trim()); setEditId(null); };
  const insert = (it: LibraryPortfolioItem) => {
    onInsert(it);
    setAdded((prev) => new Set(prev).add(it.id));
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 860, maxHeight: "88vh", overflow: "auto", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div className={styles.cardTitle} style={{ margin: 0 }}>Biblioteca de portfólio</div>
          <button type="button" className={styles.btn} onClick={onClose}>Fechar</button>
        </div>

        <p className={styles.pageHint} style={{ marginTop: 8, marginBottom: 14 }}>
          Envie suas imagens uma única vez aqui e reutilize em qualquer proposta —
          clique numa imagem para adicioná-la ao portfólio desta proposta. O mesmo
          arquivo é reaproveitado (não duplica o armazenamento).
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Enviando…" : "⬆ Enviar para a biblioteca"}
          </button>
          <span className={styles.pageHint} style={{ margin: 0 }}>{items.length} imagem{items.length === 1 ? "" : "s"} na biblioteca</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files && e.target.files.length > 0) onUpload(e.target.files); e.target.value = ""; }}
          />
        </div>

        {items.length === 0 ? (
          <p className={styles.pageHint} style={{ margin: 0 }}>
            Nenhuma imagem na biblioteca ainda. Use <strong>⬆ Enviar para a biblioteca</strong> acima.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden", background: "var(--color-surface-2)" }}>
                <button
                  type="button"
                  onClick={() => insert(it)}
                  title="Adicionar ao portfólio desta proposta"
                  style={{ display: "block", width: "100%", padding: 0, border: "none", background: "var(--color-surface)", cursor: "pointer", aspectRatio: "4 / 3", overflow: "hidden", position: "relative" }}
                >
                  <img src={it.image} alt={it.caption || "Portfólio"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", top: 6, right: 6, background: added.has(it.id) ? "#4ade80" : "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 7px" }}>
                    {added.has(it.id) ? "✓ Adicionada" : "+ Adicionar"}
                  </span>
                </button>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {editId === it.id ? (
                    <input
                      className={styles.input}
                      autoFocus
                      value={editCap}
                      onChange={(e) => setEditCap(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                      onBlur={commitEdit}
                      placeholder="Legenda (opcional)"
                      style={{ fontSize: 12.5 }}
                    />
                  ) : (
                    <div style={{ fontSize: 12.5, color: it.caption ? "var(--color-text-primary)" : "var(--color-text-muted)", minHeight: 18, lineHeight: 1.4, wordBreak: "break-word" }}>
                      {it.caption || "Sem legenda"}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className={styles.btn} title="Editar legenda" onClick={() => (editId === it.id ? commitEdit() : startEdit(it))} style={{ padding: "4px 10px" }}>✎</button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ marginLeft: "auto", minWidth: delId === it.id ? 96 : undefined, padding: "4px 10px" }}
                      title="Remover da biblioteca (não apaga das propostas que já usam)"
                      onClick={() => { if (delId === it.id) { onDelete(it.id); setDelId(null); } else setDelId(it.id); }}
                      onBlur={() => setDelId((d) => (d === it.id ? null : d))}
                    >
                      {delId === it.id ? "Confirmar?" : "✕"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <UploadHint />
        </div>
      </div>
    </div>
  );
}
