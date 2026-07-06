// Dica reutilizável para os pontos de upload de imagem do admin: orienta a
// comprimir / converter para WebP antes de subir, evitando estourar o
// armazenamento (R2). Theme-aware via CSS vars da .shell (não depende de
// nenhum módulo de estilo específico, então funciona em qualquer editor).
export default function UploadHint({ compact = false }: { compact?: boolean }) {
  return (
    <p
      style={{
        fontSize: compact ? 12 : 12.5,
        lineHeight: 1.5,
        margin: "8px 0 0",
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--color-surface-2, rgba(127,127,127,0.08))",
        border: "1px solid var(--color-border, rgba(127,127,127,0.16))",
        color: "var(--color-text-secondary, #888)",
      }}
    >
      💡 <strong>Dica:</strong> imagens grandes consomem armazenamento. Antes de
      subir, comprima ou converta para <strong>WebP</strong> em{" "}
      <a
        href="https://squoosh.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--color-accent, #b8860b)", fontWeight: 600, textDecoration: "underline" }}
      >
        squoosh.app
      </a>{" "}
      ou{" "}
      <a
        href="https://tinypng.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--color-accent, #b8860b)", fontWeight: 600, textDecoration: "underline" }}
      >
        tinypng.com
      </a>{" "}
      (grátis) — reduz bastante o tamanho mantendo a qualidade.
    </p>
  );
}
