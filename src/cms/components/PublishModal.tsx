import { useState } from "react";
import type { CMSPost } from "../types";
import { useGitHub } from "../hooks/useGitHub";
import type { PublishResult } from "../types";

interface PublishModalProps {
  post: CMSPost;
  posts: CMSPost[];
  sha: string;
  onSuccess: (sha: string) => void;
  onClose: () => void;
}

export function PublishModal({ post, posts, sha, onSuccess, onClose }: PublishModalProps) {
  const { savePosts, loading, error, getStoredToken, setStoredToken, testToken } = useGitHub();
  const [token, setToken] = useState(getStoredToken());
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [commitMsg, setCommitMsg] = useState(
    post.slug ? `feat: atualiza post "${post.title}"` : `feat: novo post "${post.title}"`
  );

  const handleValidate = async () => {
    setValidating(true);
    const valid = await testToken(token);
    setTokenValid(valid);
    if (valid) setStoredToken(token);
    setValidating(false);
  };

  const handlePublish = async () => {
    if (!token) return;
    const existing = posts.findIndex((p) => p.slug === post.slug);
    let newPosts: CMSPost[];
    if (existing >= 0) {
      newPosts = posts.map((p) => (p.slug === post.slug ? post : p));
    } else {
      newPosts = [post, ...posts];
    }
    const res = await savePosts(token, newPosts, sha, commitMsg);
    setResult(res);
    if (res.success) onSuccess("");
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: "8px 12px", fontSize: "13px",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    background: "#141414", color: "#f5f5f5", outline: "none", fontFamily: "'Inter', sans-serif",
  };

  const btnPrimary: React.CSSProperties = {
    flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, borderRadius: "12px",
    border: "none", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "#f5f5f5", color: "#0a0a0a",
  };

  const btnSecondary: React.CSSProperties = {
    ...btnPrimary, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#ccc",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#1c1c1c", borderRadius: "16px", width: "100%", maxWidth: "480px", border: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h3 style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "15px" }}>Publicar no GitHub</h3>
            <p style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Atualiza o arquivo do blog e dispara o deploy na Cloudflare</p>
          </div>
          <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {result ? (
            <div style={{
              borderRadius: "12px", padding: "20px", textAlign: "center",
              background: result.success ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${result.success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{result.success ? "🎉" : "❌"}</div>
              <p style={{ fontWeight: 600, color: result.success ? "#10b981" : "#ef4444" }}>{result.message}</p>
              {result.commitUrl && (
                <a href={result.commitUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: "8px", display: "inline-block", fontSize: "13px", color: "#10b981", textDecoration: "underline" }}>Ver commit no GitHub →</a>
              )}
              <div style={{ marginTop: "16px" }}>
                <button onClick={onClose} style={{ ...btnPrimary, flex: "none", padding: "8px 20px" }}>Fechar</button>
              </div>
            </div>
          ) : (
            <>
              {/* Token */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "6px" }}>
                  GitHub Token
                  {tokenValid === true && <span style={{ marginLeft: "8px", fontSize: "11px", color: "#10b981" }}>✓ Válido</span>}
                  {tokenValid === false && <span style={{ marginLeft: "8px", fontSize: "11px", color: "#ef4444" }}>✗ Inválido</span>}
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="password" value={token} onChange={(e) => { setToken(e.target.value); setTokenValid(null); }} placeholder="ghp_..." style={{ ...inputStyle, fontFamily: "monospace" }} />
                  <button type="button" onClick={handleValidate} disabled={!token || validating} style={{ padding: "8px 12px", fontSize: "13px", background: "#242424", color: "#ccc", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap", opacity: !token || validating ? 0.5 : 1 }}>
                    {validating ? "..." : "Testar"}
                  </button>
                </div>
                <p style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>Salvo localmente no navegador.</p>
              </div>

              {/* Post summary */}
              <div style={{ background: "#141414", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Post a publicar</p>
                <p style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "13px" }}>{post.title}</p>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>/{post.slug} · {post.category} · {post.date}</p>
              </div>

              {/* Commit message */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "6px" }}>Mensagem do commit</label>
                <input type="text" value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace" }} />
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "12px" }}>
                  <p style={{ fontSize: "13px", color: "#ef4444" }}>❌ {error}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
                <button type="button" onClick={handlePublish} disabled={!token || loading} style={{ ...btnPrimary, opacity: !token || loading ? 0.5 : 1 }}>
                  {loading ? "Publicando..." : "🚀 Publicar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
