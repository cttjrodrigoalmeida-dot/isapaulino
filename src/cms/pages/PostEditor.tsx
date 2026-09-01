import { useState, useEffect } from "react";
import type { CMSPost } from "../types";
import { RichTextEditor } from "../components/RichTextEditor";
import { SEOPanel } from "../components/SEOPanel";
import { ImageField } from "../components/ImageField";
import { PublishModal } from "../components/PublishModal";
import { CATEGORIES, slugify, estimateReadTime, formatDateBR, todayISO } from "../hooks/usePosts";

interface PostEditorProps {
  post: CMSPost;
  posts: CMSPost[];
  sha: string;
  isNew: boolean;
  onSave: (post: CMSPost) => void;
  onBack: () => void;
  onPublishSuccess: (sha: string) => void;
}

type PanelTab = "content" | "image" | "seo" | "settings";

export function PostEditor({ post: initialPost, posts, sha, isNew, onSave, onBack, onPublishSuccess }: PostEditorProps) {
  const [post, setPost] = useState<CMSPost>(initialPost);
  const [activeTab, setActiveTab] = useState<PanelTab>("content");
  const [showPublish, setShowPublish] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!isNew);

  useEffect(() => {
    if (isNew && !slugManuallyEdited && post.title) {
      setPost((p) => ({ ...p, slug: slugify(post.title) }));
    }
  }, [post.title, isNew, slugManuallyEdited]);

  useEffect(() => {
    if (post.content) {
      const rt = estimateReadTime(post.content);
      setPost((p) => ({ ...p, readTime: rt }));
    }
  }, [post.content]);

  const update = (updates: Partial<CMSPost>) => {
    setPost((p) => ({ ...p, ...updates }));
  };

  const handleSave = () => {
    onSave(post);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const tabs: { id: PanelTab; label: string; icon: string }[] = [
    { id: "content", label: "Conteúdo", icon: "✏️" },
    { id: "image", label: "Imagem", icon: "🖼" },
    { id: "seo", label: "SEO", icon: "🔍" },
    { id: "settings", label: "Detalhes", icon: "⚙️" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "13px",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    background: "#141414", color: "#f5f5f5", outline: "none", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0a" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#888", background: "transparent", border: "none", cursor: "pointer" }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {savedToast && (
            <span style={{ fontSize: "12px", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(16,185,129,0.2)" }}>✓ Salvo localmente</span>
          )}
          <button onClick={handleSave} style={{ padding: "8px 16px", fontSize: "13px", background: "#242424", color: "#ccc", borderRadius: "12px", fontWeight: 500, border: "none", cursor: "pointer" }}>Salvar rascunho</button>
          <button onClick={() => setShowPublish(true)} disabled={!post.title || !post.slug || !post.content}
            style={{ padding: "8px 16px", fontSize: "13px", background: "#f5f5f5", color: "#0a0a0a", borderRadius: "12px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", opacity: !post.title || !post.slug || !post.content ? 0.4 : 1 }}>
            🚀 Publicar
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", padding: "12px 24px 0", background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 500,
              borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", transition: "all 0.2s",
              borderBottom: activeTab === t.id ? "2px solid #f5f5f5" : "2px solid transparent",
              marginBottom: "-1px",
              background: activeTab === t.id ? "rgba(255,255,255,0.05)" : "transparent",
              color: activeTab === t.id ? "#f5f5f5" : "#888",
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "content" && (
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
            <div style={{ marginBottom: "24px", paddingTop: "8px" }}>
              <input type="text" value={post.title} onChange={(e) => update({ title: e.target.value })} placeholder="Título do artigo..."
                style={{ width: "100%", fontSize: "2.5rem", fontWeight: 600, color: "#f5f5f5", background: "transparent", border: "none", outline: "none", fontFamily: "'Kinn', sans-serif", marginBottom: "8px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <span style={{ fontSize: "13px", color: "#666" }}>isabelapaulino.com/blog/</span>
                <input type="text" value={post.slug}
                  onChange={(e) => { setSlugManuallyEdited(true); update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }}
                  placeholder="seu-slug"
                  style={{ fontSize: "13px", color: "#d4c5b0", fontFamily: "monospace", background: "transparent", border: "none", outline: "none", borderBottom: "1px solid transparent", width: "100%", maxWidth: "300px" }} />
              </div>
            </div>
            <div style={{ marginBottom: "32px" }}>
              <input type="text" value={post.subtitle} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Subtítulo — aparece logo abaixo do título..."
                style={{ width: "100%", fontSize: "1.25rem", color: "#aaa", background: "transparent", border: "none", outline: "none", borderBottom: "1px solid transparent", paddingBottom: "4px" }} />
            </div>
            <RichTextEditor content={post.content || ""} onChange={(html) => update({ content: html })} placeholder="Comece a escrever o seu artigo aqui..." />
          </div>
        )}

        {activeTab === "image" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f5f5f5", marginBottom: "16px" }}>Imagem de Capa</h2>
            <ImageField post={post} onChange={update} />
          </div>
        )}

        {activeTab === "seo" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
            <SEOPanel post={post} onChange={update} />
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f5f5f5" }}>Detalhes do Post</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>Categoria</label>
                <select value={post.category} onChange={(e) => update({ category: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>Data de publicação</label>
                <input type="date" defaultValue={todayISO()} onChange={(e) => update({ date: formatDateBR(e.target.value) })} style={inputStyle} />
                <p style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>Atual: {post.date}</p>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>Tempo de leitura</label>
              <input type="text" value={post.readTime} onChange={(e) => update({ readTime: e.target.value })} placeholder="Ex: 5 min" style={inputStyle} />
              <p style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>Calculado automaticamente com base no número de palavras.</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="checkbox" id="featured" checked={post.featured || false} onChange={(e) => update({ featured: e.target.checked })} style={{ width: "16px", height: "16px", accentColor: "#d4c5b0" }} />
              <label htmlFor="featured" style={{ fontSize: "13px", fontWeight: 500, color: "#ccc" }}>
                Post em destaque <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666", fontWeight: 400 }}>(aparece em destaque no blog)</span>
              </label>
            </div>

            {/* Danger zone */}
            <div style={{ border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "16px", background: "rgba(239,68,68,0.05)" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#ef4444", marginBottom: "4px" }}>⚠️ Zona de perigo</p>
              <p style={{ fontSize: "12px", color: "rgba(239,68,68,0.7)", marginBottom: "12px" }}>Alterar o slug de um post publicado quebra links existentes.</p>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ef4444", marginBottom: "4px" }}>Slug (URL do post)</label>
                <input type="text" value={post.slug}
                  onChange={(e) => { setSlugManuallyEdited(true); update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }); }}
                  style={{ ...inputStyle, borderColor: "rgba(239,68,68,0.3)", fontFamily: "monospace" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showPublish && (
        <PublishModal post={post} posts={posts} sha={sha} onSuccess={(newSha) => { setShowPublish(false); onPublishSuccess(newSha); }} onClose={() => setShowPublish(false)} />
      )}
    </div>
  );
}
