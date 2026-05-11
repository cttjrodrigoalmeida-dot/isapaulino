import { useState } from "react";
import type { CMSPost } from "../types";
import { useGitHub } from "../hooks/useGitHub";

interface DashboardProps {
  posts: CMSPost[];
  loading: boolean;
  deleteLoading: string | null;
  lastSync: Date | null;
  hasToken: boolean;
  onNew: () => void;
  onEdit: (post: CMSPost) => void;
  onDelete: (slug: string) => Promise<void>;
  onRefresh: () => void;
  onTokenSaved: (token: string) => void;
  repoUrl: string;
}

function TokenSetup({ onTokenSaved }: { onTokenSaved: (t: string) => void }) {
  const { testToken } = useGitHub();
  const [token, setToken] = useState("");
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  const handleSave = async () => {
    if (!token) return;
    setValidating(true);
    const valid = await testToken(token);
    setValidating(false);
    setStatus(valid ? "ok" : "fail");
    if (valid) onTokenSaved(token);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 32px", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔑</div>
      <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#f5f5f5", marginBottom: "8px" }}>Configure o token do GitHub</h3>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px", maxWidth: "380px" }}>
        Para carregar e publicar posts, informe seu Personal Access Token com permissão <code style={{ background: "#242424", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>repo</code>.
        <br />
        <span style={{ fontSize: "11px", color: "#666", marginTop: "4px", display: "block" }}>Salvo apenas no seu navegador.</span>
      </p>
      <div style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "380px" }}>
        <input
          type="password" value={token}
          onChange={(e) => { setToken(e.target.value); setStatus("idle"); }}
          placeholder="ghp_..."
          style={{ flex: 1, padding: "10px 12px", fontSize: "13px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", background: "#141414", color: "#f5f5f5", outline: "none", fontFamily: "monospace" }}
        />
        <button onClick={handleSave} disabled={!token || validating}
          style={{ padding: "10px 16px", background: "#f5f5f5", color: "#0a0a0a", fontSize: "13px", fontWeight: 600, borderRadius: "12px", border: "none", cursor: "pointer", opacity: !token || validating ? 0.5 : 1 }}>
          {validating ? "..." : "Salvar"}
        </button>
      </div>
      {status === "fail" && <p style={{ marginTop: "12px", fontSize: "12px", color: "#ef4444" }}>Token inválido ou sem permissão.</p>}
      {status === "ok" && <p style={{ marginTop: "12px", fontSize: "12px", color: "#10b981" }}>✓ Token válido! Carregando posts...</p>}
    </div>
  );
}

export function Dashboard({
  posts, loading, deleteLoading, lastSync, hasToken,
  onNew, onEdit, onDelete, onRefresh, onTokenSaved, repoUrl,
}: DashboardProps) {
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = posts.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = async (slug: string) => {
    if (deleteConfirm === slug) {
      setDeleteConfirm(null);
      await onDelete(slug);
    } else {
      setDeleteConfirm(slug);
      setTimeout(() => setDeleteConfirm((prev) => (prev === slug ? null : prev)), 4000);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#0a0a0a" }}>
      {/* Header */}
      <div style={{ padding: "32px 32px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#f5f5f5", fontFamily: "'Kinn', sans-serif" }}>Posts do Blog</h1>
            <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
              {posts.length} post{posts.length !== 1 ? "s" : ""} gerenciados pelo CMS
              {lastSync && <span style={{ marginLeft: "8px", color: "#666" }}>· Sync {lastSync.toLocaleTimeString("pt-BR")}</span>}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={onRefresh} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", fontSize: "13px", color: "#ccc", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
              <span style={loading ? { animation: "spin 1s linear infinite", display: "inline-block" } : {}}>↻</span> Sincronizar
            </button>
            <button onClick={onNew}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "#0a0a0a", background: "#f5f5f5", borderRadius: "12px", border: "none", cursor: "pointer" }}>
              + Novo Post
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666" }}>🔍</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título ou categoria..."
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "16px", padding: "10px 16px 10px 36px", fontSize: "13px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f5f5f5", outline: "none" }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 32px 32px" }}>
        {!hasToken && !loading && <TokenSetup onTokenSaved={onTokenSaved} />}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 0", color: "#888" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid #333", borderTopColor: "#f5f5f5", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
            <p>Carregando posts do GitHub...</p>
          </div>
        )}

        {!loading && hasToken && filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 0", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{search ? "🔍" : "📝"}</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ccc", marginBottom: "8px" }}>
              {search ? "Nenhum post encontrado" : "Nenhum post ainda"}
            </h3>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px", maxWidth: "280px" }}>
              {search ? `Não há posts com "${search}".` : "Comece criando o primeiro post do seu blog."}
            </p>
            {!search && (
              <button onClick={onNew} style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "#0a0a0a", background: "#f5f5f5", borderRadius: "12px", border: "none", cursor: "pointer" }}>+ Criar primeiro post</button>
            )}
          </div>
        )}

        {!loading && hasToken && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            {filtered.map((post) => {
              const isDeleting = deleteLoading === post.slug;
              const confirmingDelete = deleteConfirm === post.slug;

              return (
                <div key={post.slug}
                  style={{
                    background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px",
                    padding: "20px", display: "flex", alignItems: "center", gap: "20px", transition: "all 0.2s",
                    opacity: isDeleting ? 0.5 : 1,
                  }}>
                  {/* Cover */}
                  <div style={{ width: "64px", height: "64px", borderRadius: "8px", overflow: "hidden", background: "#1c1c1c", flexShrink: 0 }}>
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "#444" }}>📄</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "#d4c5b0", background: "rgba(212,197,176,0.1)", padding: "2px 8px", borderRadius: "12px" }}>{post.category}</span>
                      {post.featured && <span style={{ fontSize: "11px", fontWeight: 500, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "12px" }}>⭐ Destaque</span>}
                    </div>
                    <h3 style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>{post.date}</span>
                      <span style={{ fontSize: "12px", color: "#444" }}>·</span>
                      <span style={{ fontSize: "12px", color: "#666" }}>{post.readTime}</span>
                      <span style={{ fontSize: "12px", color: "#444" }}>·</span>
                      <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#555" }}>/{post.slug}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {isDeleting ? (
                      <span style={{ fontSize: "12px", color: "#ef4444" }}>Excluindo...</span>
                    ) : (
                      <>
                        <button onClick={() => onEdit(post)} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: "14px" }} title="Editar">✏️</button>
                        <button onClick={() => handleDeleteClick(post.slug)}
                          style={{
                            padding: "0 10px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500,
                            background: confirmingDelete ? "#ef4444" : "transparent",
                            color: confirmingDelete ? "#fff" : "#888",
                          }} title={confirmingDelete ? "Confirmar exclusão" : "Excluir"}>
                          {confirmingDelete ? "⚠️ Confirmar" : "🗑"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Posts em <code style={{ background: "#1c1c1c", padding: "2px 6px", borderRadius: "4px", color: "#888" }}>src/data/cmsPosts.json</code>
          </p>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888", textDecoration: "none" }}>
            Ver no GitHub →
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
