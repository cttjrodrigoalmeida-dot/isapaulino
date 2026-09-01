import type { CMSPost, SEOScore } from "../types";

function computeSEOScore(post: CMSPost): SEOScore {
  const titleLen = (post.seoTitle || post.title || "").length;
  const descLen = (post.metaDescription || post.subtitle || "").length;
  const textContent = (post.content || "").replace(/<[^>]+>/g, "");
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const hasH2 = /<h2/i.test(post.content || "");
  const hasH3 = /<h3/i.test(post.content || "");

  const checks = [
    { label: "Título SEO entre 50–60 caracteres", passed: titleLen >= 50 && titleLen <= 60, tip: `Título atual: ${titleLen} car. Ideal: 50-60.` },
    { label: "Meta description com 150–160 caracteres", passed: descLen >= 150 && descLen <= 160, tip: `Meta description: ${descLen} car. Google mostra ~155.` },
    { label: "Conteúdo com pelo menos 300 palavras", passed: wordCount >= 300, tip: `Texto: ${wordCount} palavras. Artigos com 700+ ranqueiam melhor.` },
    { label: "Subtítulo (H2) no conteúdo", passed: hasH2, tip: "Use H2 para organizar — o Google valoriza estrutura clara." },
    { label: "Subtítulo H3 no conteúdo", passed: hasH3, tip: "Subseções com H3 ajudam leitores e buscadores." },
    { label: "Imagem de capa definida", passed: !!post.coverImage, tip: "Aumenta o CTR nos resultados de busca e redes sociais." },
    { label: "Texto alternativo da imagem", passed: !!(post.coverImageAlt && post.coverImageAlt.length > 5), tip: "Ajuda o Google Imagens e acessibilidade." },
    { label: "Slug simples e descritivo", passed: !!(post.slug && post.slug.length > 5 && !/\s/.test(post.slug)), tip: "Curto, sem acentos e sem espaços." },
    { label: "Slug sem caracteres especiais", passed: !!(post.slug && /^[a-z0-9-]+$/.test(post.slug)), tip: "Use apenas letras minúsculas, números e hífens." },
    { label: "Categoria definida", passed: !!post.category, tip: "Organiza o conteúdo e melhora a navegação." },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  return { score, checks };
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const bg = score >= 80 ? "rgba(16,185,129,0.1)" : score >= 50 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  const label = score >= 80 ? "Ótimo" : score >= 50 ? "Mediano" : "Fraco";
  const emoji = score >= 80 ? "🟢" : score >= 50 ? "🟡" : "🔴";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "20px", border: `1px solid ${color}30`, background: bg, fontSize: "13px", fontWeight: 600, color }}>
      <span>{emoji}</span>
      <span>SEO {label}</span>
      <span style={{ fontWeight: 700 }}>{score}/100</span>
    </div>
  );
}

interface SEOPanelProps {
  post: CMSPost;
  onChange: (updates: Partial<CMSPost>) => void;
}

export function SEOPanel({ post, onChange }: SEOPanelProps) {
  const { score, checks } = computeSEOScore(post);
  const seoTitle = post.seoTitle || post.title || "";
  const metaDesc = post.metaDescription || post.subtitle || "";
  const previewTitle = seoTitle.length > 60 ? seoTitle.slice(0, 57) + "..." : seoTitle;
  const previewDesc = metaDesc.length > 155 ? metaDesc.slice(0, 152) + "..." : metaDesc;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "13px",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    background: "#141414", color: "#f5f5f5", outline: "none", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "16px" }}>Otimização SEO</h3>
        <ScoreBadge score={score} />
      </div>

      {/* Google Preview */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Preview no Google</p>
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "#3C4043", marginBottom: "4px" }}>isabelapaulino.com/blog/{post.slug || "seu-slug"}</div>
          <div style={{ color: "#1A0DAB", fontSize: "18px", lineHeight: 1.3, marginBottom: "4px" }}>{previewTitle || "Título do seu artigo"}</div>
          <div style={{ fontSize: "13px", color: "#4D5156", lineHeight: 1.4 }}>{previewDesc || "Insira a meta description..."}</div>
        </div>
      </div>

      {/* Título SEO */}
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>
          Título SEO
          <span style={{ marginLeft: "8px", fontSize: "11px", color: seoTitle.length > 60 ? "#ef4444" : seoTitle.length >= 50 ? "#10b981" : "#f59e0b" }}>
            {seoTitle.length}/60
          </span>
        </label>
        <input type="text" value={post.seoTitle || ""} onChange={(e) => onChange({ seoTitle: e.target.value })} placeholder={post.title || "Título para o Google (50-60 car.)"} style={inputStyle} />
        <p style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>Deixe em branco para usar o título principal.</p>
      </div>

      {/* Meta Description */}
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#ccc", marginBottom: "4px" }}>
          Meta Description
          <span style={{ marginLeft: "8px", fontSize: "11px", color: metaDesc.length > 160 ? "#ef4444" : metaDesc.length >= 150 ? "#10b981" : "#f59e0b" }}>
            {metaDesc.length}/160
          </span>
        </label>
        <textarea rows={3} value={post.metaDescription || ""} onChange={(e) => onChange({ metaDescription: e.target.value })} placeholder={post.subtitle || "Descrição para o Google (150-160 car.)"} style={{ ...inputStyle, resize: "none" }} />
        <p style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>Deixe em branco para usar o subtítulo.</p>
      </div>

      {/* Checklist */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Checklist SEO</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {checks.map((check, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{
                width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: "10px", marginTop: "2px",
                background: check.passed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)",
                color: check.passed ? "#10b981" : "#ef4444",
              }}>
                {check.passed ? "✓" : "×"}
              </span>
              <div>
                <span style={{ fontSize: "12px", color: check.passed ? "#ccc" : "#888" }}>{check.label}</span>
                {!check.passed && <p style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>💡 {check.tip}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginBottom: "6px" }}>
          <span>Pontuação SEO</span>
          <span style={{ fontWeight: 600 }}>{score}/100</span>
        </div>
        <div style={{ height: "8px", background: "#1c1c1c", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "4px", transition: "all 0.5s",
            width: `${score}%`,
            background: score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444",
          }} />
        </div>
      </div>
    </div>
  );
}
