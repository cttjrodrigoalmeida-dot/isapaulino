// Ícones inline (sem dependências) para o painel. stroke = currentColor.
import type { ReactNode } from "react";

const S = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const IcDashboard = () => <S><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>;
export const IcComercial = () => <S><path d="M4 7h16M4 12h16M4 17h10" /></S>;
export const IcClientes = () => <S><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 8.5a3 3 0 0 1 0 5M19 20c0-2.2-1-3.8-2.5-4.7" /></S>;
export const IcProjetos = () => <S><path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></S>;
export const IcFinanceiro = () => <S><circle cx="12" cy="12" r="8.5" /><path d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1.1 1.6-2.5 1.6-2.5.7-2.5 1.7 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7" /></S>;
export const IcCalendario = () => <S><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></S>;
export const IcRelatorios = () => <S><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M9 13v4M12 10v7M15 14v3" /></S>;
export const IcArquivos = () => <S><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></S>;
export const IcStorage = () => <S><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></S>;
export const IcContrato = () => <S><path d="M6 3h8l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M13 3v5h5" /><path d="M8.5 16c1-1.2 2-1.2 3 0s2 1.2 3 0" /></S>;
export const IcTarefas = () => <S><rect x="3.5" y="4" width="6" height="6" rx="1.5" /><path d="M5 7l1.2 1.2L8 6" /><rect x="3.5" y="14" width="6" height="6" rx="1.5" /><path d="M13 6.5h8M13 17.5h8" /></S>;
export const IcTabela = () => <S><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9.5h18M3 15h18M9 4v16" /></S>;
export const IcBiblioteca = () => <S><path d="M12 5.5c-1.6-1.1-3.6-1.5-6-1.5v13c2.4 0 4.4.4 6 1.5 1.6-1.1 3.6-1.5 6-1.5V4c-2.4 0-4.4.4-6 1.5Z" /><path d="M12 5.5v13" /></S>;

export const IcSearch = () => <S size={16}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>;
export const IcBell = () => <S size={18}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></S>;
export const IcSun = () => <S size={17}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></S>;
export const IcMoon = () => <S size={17}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" /></S>;
export const IcChevronDown = () => <S size={15}><path d="m6 9 6 6 6-6" /></S>;
export const IcMenu = () => <S size={18}><path d="M4 6h16M4 12h16M4 18h16" /></S>;
export const IcPlus = () => <S size={15}><path d="M12 5v14M5 12h14" /></S>;
export const IcLock = () => <S size={16}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></S>;
export const IcLogout = () => <S size={16}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M9 12h11M16 8l4 4-4 4" /></S>;
export const IcExternal = () => <S size={16}><path d="M14 4h6v6M20 4l-8 8" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></S>;
export const IcRevenue = () => <S size={16}><path d="M3 17l5-5 4 3 6-7" /><path d="M16 8h4v4" /></S>;
export const IcReceived = () => <S size={16}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></S>;
export const IcToReceive = () => <S size={16}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></S>;
export const IcOverdue = () => <S size={16}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5M12 17v.5" /></S>;
export const IcTicket = () => <S size={16}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" /></S>;
export const IcGrowth = () => <S size={16}><path d="M3 17l6-6 4 4 7-8" /></S>;
export const IcArrowRight = () => <S size={13}><path d="M5 12h14M13 6l6 6-6 6" /></S>;
export const IcCheck = () => <S size={13}><path d="M5 12.5l4.5 4.5L19 7" /></S>;
export const IcWhatsApp = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607z" />
  </svg>
);
