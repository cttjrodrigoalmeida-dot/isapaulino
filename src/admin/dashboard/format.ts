// Formatação pt-BR reutilizada pelos widgets da dashboard.

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(n: number): string {
  return BRL.format(Number.isFinite(n) ? n : 0);
}

/** "R$ 48.2k" — versão compacta para cards/KPIs. */
export function formatBRLShort(n: number): string {
  if (!Number.isFinite(n)) n = 0;
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `R$ ${k.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return formatBRL(n);
}

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE.format(d);
}

/** "há 5 min" / "há 2 h" / "ontem" — relativo curto. */
export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} d`;
  return formatDate(iso);
}

const SAUDACAO = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};
export const saudacao = SAUDACAO;
