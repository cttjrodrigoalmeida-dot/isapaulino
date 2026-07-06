import { useRef, useState } from "react";
import type { Proposal, GalleryItem } from "../components/proposal/types";
import { api, ApiError } from "./api";
import UploadHint from "./UploadHint";
import styles from "./Admin.module.css";

// Editor do PORTFÓLIO / "Projetos anteriores" da proposta.
// A Isabela sobe imagens (vão pro R2 via /api/upload), reordena, legenda e
// remove. Se a lista ficar vazia, a seção some da página pública.
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
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    const list = gallery.slice();
    [list[i], list[j]] = [list[j], list[i]];
    setGallery(list);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Portfólio · Projetos anteriores</div>
      <div className={styles.pageHint} style={{ marginTop: -4, marginBottom: 12 }}>
        As imagens abaixo aparecem na seção “Portfólio” da proposta. Se ficar vazia, a seção não é exibida.
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
          Nenhuma imagem ainda. Clique em “Adicionar imagens” para montar o portfólio.
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
              style={{
                border: "1px solid var(--color-border, rgba(127,127,127,0.16))",
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--color-surface-2, rgba(127,127,127,0.05))",
              }}
            >
              <div style={{ aspectRatio: "4 / 3", background: "var(--color-surface, #0000000a)", overflow: "hidden" }}>
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
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className={styles.btn} onClick={() => move(i, -1)} disabled={i === 0} title="Mover para trás">↑</button>
                  <button type="button" className={styles.btn} onClick={() => move(i, 1)} disabled={i === gallery.length - 1} title="Mover para frente">↓</button>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeItem(i)} style={{ marginLeft: "auto" }}>
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? "Enviando…" : "⬆ Adicionar imagens"}
      </button>
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
    </div>
  );
}
