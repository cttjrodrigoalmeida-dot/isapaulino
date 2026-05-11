import { useState } from "react";
import type { CMSPost } from "../types";

interface ImageFieldProps {
  post: CMSPost;
  onChange: (updates: Partial<CMSPost>) => void;
}

export function ImageField({ post, onChange }: ImageFieldProps) {
  const [tab, setTab] = useState<"url" | "preview">("url");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "6px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
    background: active ? "#242424" : "transparent",
    color: active ? "#f5f5f5" : "#888",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    background: "#141414",
    color: "#f5f5f5",
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", gap: "4px", background: "#1c1c1c", borderRadius: "8px", padding: "4px" }}>
        {(["url", "preview"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === "url" ? "🔗 URL da Imagem" : "👁 Preview"}
          </button>
        ))}
      </div>

      {tab === "url" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>
              URL da imagem de capa
            </label>
            <input
              type="url"
              value={post.coverImage || ""}
              onChange={(e) => onChange({ coverImage: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              style={inputStyle}
            />
            <p style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>
              Cole um link do Unsplash, Pexels ou qualquer URL de imagem.
            </p>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>
              Texto alternativo (Alt Text) <span style={{ color: "#666", fontWeight: 400 }}>— SEO</span>
            </label>
            <input
              type="text"
              value={post.coverImageAlt || ""}
              onChange={(e) => onChange({ coverImageAlt: e.target.value })}
              placeholder="Descreva a imagem em poucas palavras"
              style={inputStyle}
            />
          </div>
          <div style={{ background: "rgba(212,197,176,0.08)", border: "1px solid rgba(212,197,176,0.15)", borderRadius: "8px", padding: "12px" }}>
            <p style={{ fontSize: "12px", color: "#d4c5b0", fontWeight: 500, marginBottom: "4px" }}>💡 Dica: Unsplash gratuito</p>
            <p style={{ fontSize: "12px", color: "rgba(212,197,176,0.7)" }}>
              Use <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "#d4c5b0" }}>unsplash.com</a> para imagens profissionais gratuitas.
            </p>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div>
          {post.coverImage ? (
            <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "#1c1c1c" }}>
              <img
                src={post.coverImage}
                alt={post.coverImageAlt || post.title || "Capa do post"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "11px", padding: "4px 8px", borderRadius: "4px" }}>
                {post.coverImageAlt ? "✓ Alt text definido" : "⚠ Sem alt text"}
              </div>
            </div>
          ) : (
            <div style={{
              aspectRatio: "16/9", borderRadius: "12px", background: "#1c1c1c",
              border: "2px dashed rgba(255,255,255,0.12)", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", color: "#666",
            }}>
              <span style={{ fontSize: "2rem", marginBottom: "8px" }}>🖼</span>
              <p style={{ fontSize: "13px" }}>Nenhuma imagem definida</p>
              <p style={{ fontSize: "11px" }}>Cole uma URL na aba "URL da Imagem"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
