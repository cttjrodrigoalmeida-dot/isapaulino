import { useState, useEffect, useCallback, useRef } from "react";
import type { CMSPost } from "./types";
import { useGitHub } from "./hooks/useGitHub";
import { usePosts, createEmptyPost } from "./hooks/usePosts";
import { Dashboard } from "./pages/Dashboard";
import { PostEditor } from "./pages/PostEditor";

type View = "dashboard" | "editor";

export function CMSApp() {
  const { fetchPosts, savePosts, repoUrl, setStoredToken } = useGitHub();
  const { posts, setPosts, sha, setSha, addPost, updatePost, deletePost } = usePosts();
  const [view, setView] = useState<View>("dashboard");
  const [editingPost, setEditingPost] = useState<CMSPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadPostsRef = useRef<(() => Promise<void>) | null>(null);
  const getToken = () => localStorage.getItem("cms_github_token") || "";

  const loadPosts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setInitError(null);
    try {
      const { posts: fetched, sha: fetchedSha } = await fetchPosts(token);
      setPosts(fetched);
      setSha(fetchedSha);
      setLastSync(new Date());
    } catch (e: unknown) {
      setInitError(e instanceof Error ? e.message : "Erro ao carregar posts");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts]);

  loadPostsRef.current = loadPosts;

  useEffect(() => {
    loadPostsRef.current?.();
  }, []);

  const handleNew = () => {
    setEditingPost(createEmptyPost());
    setIsNew(true);
    setView("editor");
  };

  const handleEdit = (post: CMSPost) => {
    setEditingPost({ ...post });
    setIsNew(false);
    setView("editor");
  };

  const handleSave = (post: CMSPost) => {
    if (isNew && !posts.find((p) => p.slug === post.slug)) {
      addPost(post);
    } else {
      updatePost(post.slug, post);
    }
    setIsNew(false);
    setEditingPost(post);
  };

  const handleDelete = useCallback(async (slug: string) => {
    const token = getToken();
    if (!token) {
      alert("Configure o token do GitHub antes de excluir posts.");
      return;
    }
    deletePost(slug);
    setDeleteLoading(slug);
    try {
      const updatedPosts = posts.filter((p) => p.slug !== slug);
      await savePosts(token, updatedPosts, sha, `feat: remove post "${slug}"`);
      setTimeout(() => loadPostsRef.current?.(), 1200);
    } catch {
      // Post já removido localmente
    } finally {
      setDeleteLoading(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, sha, savePosts, deletePost]);

  const handlePublishSuccess = () => {
    setTimeout(() => loadPostsRef.current?.(), 1500);
  };

  const handleBack = () => {
    setView("dashboard");
    setEditingPost(null);
  };

  const handleTokenSaved = (token: string) => {
    setStoredToken(token);
    loadPostsRef.current?.();
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "#d4c5b0", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0a", fontWeight: 700, fontSize: "14px", flexShrink: 0, fontFamily: "'Kinn', sans-serif" }}>IP</div>
            <div>
              <p style={{ color: "#f5f5f5", fontWeight: 600, fontSize: "13px", lineHeight: 1.2 }}>Isabela Paulino</p>
              <p style={{ color: "#666", fontSize: "11px" }}>Blog CMS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <button onClick={() => { setView("dashboard"); setEditingPost(null); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
              borderRadius: "12px", fontSize: "13px", border: "none", cursor: "pointer", transition: "all 0.2s", textAlign: "left",
              background: view === "dashboard" ? "rgba(255,255,255,0.08)" : "transparent",
              color: view === "dashboard" ? "#f5f5f5" : "rgba(255,255,255,0.4)",
              fontWeight: view === "dashboard" ? 500 : 400,
            }}>
            <span>📋</span> Posts
          </button>
          <button onClick={handleNew}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", fontSize: "13px", border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.4)", textAlign: "left" }}>
            <span>✏️</span> Novo Post
          </button>
        </nav>

        {/* Links */}
        <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "4px" }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", fontSize: "13px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
            <span>🌐</span>Ver Site
          </a>
          <a href="/blog" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", fontSize: "13px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
            <span>📰</span>Ver Blog
          </a>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", fontSize: "13px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
            <span>🐙</span>GitHub
          </a>
        </div>

        {/* Status */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {lastSync ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>Sync: {lastSync.toLocaleTimeString("pt-BR")}</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>Configure o token</span>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#0a0a0a" }}>
        {initError && (
          <div style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.15)", padding: "10px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "#f59e0b", fontSize: "13px" }}>⚠️ {initError}</span>
            <button onClick={loadPosts} style={{ fontSize: "12px", color: "#f59e0b", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}>Tentar novamente</button>
          </div>
        )}

        {view === "dashboard" && (
          <Dashboard posts={posts} loading={loading} deleteLoading={deleteLoading} lastSync={lastSync}
            onNew={handleNew} onEdit={handleEdit} onDelete={handleDelete} onRefresh={loadPosts}
            onTokenSaved={handleTokenSaved} hasToken={!!getToken()} repoUrl={repoUrl} />
        )}

        {view === "editor" && editingPost && (
          <PostEditor post={editingPost} posts={posts} sha={sha} isNew={isNew}
            onSave={handleSave} onBack={handleBack} onPublishSuccess={handlePublishSuccess} />
        )}
      </div>
    </div>
  );
}
