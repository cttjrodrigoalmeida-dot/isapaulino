import { useEffect, useState } from "react";

// Botão flutuante "voltar ao topo" — canto inferior direito dos editores.
// Aparece só depois de rolar um pouco; rola a janela suavemente até o topo.
export default function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed", right: 20, bottom: 20, zIndex: 70,
        width: 44, height: 44, display: "grid", placeItems: "center",
        borderRadius: "10px 0 10px 0", cursor: "pointer",
        background: "var(--color-surface)", color: "var(--color-text-primary)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
