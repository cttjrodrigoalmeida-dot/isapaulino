import { useEffect, useRef, useState } from "react";
import type { Proposal, GalleryItem } from "../components/proposal/types";
import { api, ApiError, type LibraryPortfolioItem } from "./api";
import PortfolioLibraryPicker from "./PortfolioLibraryPicker";
import UploadHint from "./UploadHint";
import styles from "./Admin.module.css";

// Editor do PORTFÓLIO / "Projetos anteriores" da proposta.
// A Isabela sobe imagens (vão pro R2 via /api/upload), reordena (arrastar ou
// ↑↓), legenda e remove. Também dá para reutilizar imagens da BIBLIOTECA de
// portfólio (sobe 1x, reusa em várias propostas sem duplicar o R2).
// Se a lista ficar vazia, a seção some da página pública.
export default function GalleryEditor({
  proposal,
  onChange,
}: {
  proposal: Proposal;
  onChange: (p: Proposal) => void;
}) {
  const gallery = proposal.gallery ?? [];
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Biblioteca de portfólio (D1).
  const [library, setLibrary] = useState<LibraryPortfolioItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [libUploading, setLibUploading] = useState(false);
  const refreshLibrary = () => api.listPortfolioLibrary().then(({ items }) => setLibrary(items)).catch(() => {});
  useEffect(() => { refreshLibrary(); }, []);

  const setGallery = (items: GalleryItem[]) => onChange({ ...proposal, gallery: items });

  const addImages = async (files: FileList) => {
    setError(null);
    setUploading(true);
    try {
      const uploaded: GalleryItem[] = [];
      for (const file of Array.from(files)) {
        const { url } = await api.uploadImage(file);
        uploaded.push({ image: url });
      }
      setGallery([...gallery, ...uploaded]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Falha no upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  const setItem = (i: number, patch: Partial<GalleryItem>) =>
    setGallery(gallery.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setGallery(gallery.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => reorder(i, i + dir);
  // Move o item da posição `from` para a posição `to` (arrastar ou ↑↓).
  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= gallery.length || to >= gallery.length) return;
    const list = gallery.slice();
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setGallery(list);
  };

  // Salva uma imagem já no portfólio para a biblioteca (reutilizar depois).
  const saveToLibrary = async (it: GalleryItem) => {
    setError(null);
    try {
      await api.addToPortfolioLibrary(it.image, it.caption);
      await refreshLibrary();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Falha ao salvar na biblioteca.");
    }
  };

  // Envia arquivos direto para a BIBLIOTECA (sobe 1x, fica disponível pra todas).
  const uploadToLibrary = async (files: FileList) => {
    setError(null);
    setLibUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await api.uploadImage(file);
        await api.addToPortfolioLibrary(url, "");
      }
      await refreshLibrary();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Falha ao enviar para a biblioteca.");
    } finally {
      setLibUploading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Portfólio · Projetos anteriores</div>
      <div className={styles.pageHint} style={{ marginTop: -4, marginBottom: 12 }}>
        As imagens abaixo aparecem na seção “Portfólio” da proposta. Arraste para
        reordenar. Se ficar vazia, a seção não é exibida.
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Título da seção</label>
          <input
            className={styles.input}
            value={proposal.galleryTitle ?? ""}
            onChange={(e) => onChange({ ...proposal, galleryTitle: e.target.value })}
            placeholder="Projetos anteriores"
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Texto de apoio (opcional)</label>
        <textarea
          className={styles.textarea}
          rows={2}
          value={proposal.galleryIntro ?? ""}
          onChange={(e) => onChange({ ...proposal, galleryIntro: e.target.value })}
          placeholder="Uma amostra de detalhamentos executivos já desenvolvidos pelo estúdio…"
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {gallery.length === 0 ? (
        <div className={styles.pageHint} style={{ padding: "12px 0" }}>
          Nenhuma imagem ainda. Use “Adicionar imagens” ou “📚 Biblioteca” para montar o portfólio.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            margin: "4px 0 12px",
          }}
        >
          {gallery.map((item, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); if (overIdx !== i) setOverIdx(i); }}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              style={{
                border: overIdx === i && dragIdx !== null && dragIdx !== i
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border, rgba(127,127,127,0.16))",
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--color-surface-2, rgba(127,127,127,0.05))",
                opacity: dragIdx === i ? 0.5 : 1,
              }}
            >
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--color-surface, #0000000a)", overflow: "hidden" }}>
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.caption || `Projeto ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 12, color: "var(--color-text-muted)" }}>
                    sem imagem
                  </div>
                )}
                <span title="Arraste para reordenar" style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 6, padding: "1px 7px", fontSize: 13, cursor: "grab", userSelect: "none" }}>⠿</span>
              </div>
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  className={styles.input}
                  value={item.caption ?? ""}
                  onChange={(e) => setItem(i, { caption: e.target.value })}
                  placeholder="Legenda (opcional)"
                  style={{ fontSize: 12.5 }}
                />
                <input
                  className={`${styles.input} ${styles.mono}`}
                  value={item.image}
                  onChange={(e) => setItem(i, { image: e.target.value })}
                  placeholder="URL / caminho da imagem"
                  style={{ fontSize: 11 }}
                />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button type="button" className={styles.btn} onClick={() => move(i, -1)} disabled={i === 0} title="Mover para trás" style={{ padding: "4px 9px" }}>↑</button>
                  <button type="button" className={styles.btn} onClick={() => move(i, 1)} disabled={i === gallery.length - 1} title="Mover para frente" style={{ padding: "4px 9px" }}>↓</button>
                  <button type="button" className={styles.btn} onClick={() => saveToLibrary(item)} disabled={!item.image} title="Salvar esta imagem na biblioteca (para reusar em outras propostas)" style={{ padding: "4px 9px" }}>☆</button>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeItem(i)} style={{ marginLeft: "auto", padding: "4px 10px" }}>
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Enviando…" : "⬆ Adicionar imagens"}
        </button>
        <button type="button" className={styles.btn} onClick={() => setPickerOpen(true)} title="Reutilizar imagens que você já subiu uma vez">
          📚 Biblioteca{library.length ? ` (${library.length})` : ""}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) addImages(e.target.files);
          e.target.value = "";
        }}
      />

      <UploadHint />

      {pickerOpen && (
        <PortfolioLibraryPicker
          items={library}
          uploading={libUploading}
          onInsert={(it) => setGallery([...(proposal.gallery ?? []), { image: it.image, caption: it.caption || undefined }])}
          onUpload={uploadToLibrary}
          onRenameCaption={async (id, caption) => { await api.updatePortfolioLibraryItem(id, caption).catch(() => {}); refreshLibrary(); }}
          onDelete={async (id) => { await api.deletePortfolioLibraryItem(id).catch(() => {}); refreshLibrary(); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
