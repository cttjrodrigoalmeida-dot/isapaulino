import { useEffect, useRef, useState, useCallback } from "react";
import s from "./Dashboard.module.css";
import {
  IcSearch,
  IcBell,
  IcSun,
  IcMoon,
  IcChevronDown,
  IcMenu,
  IcLock,
  IcLogout,
  IcExternal,
} from "./icons";
import type { AdminTheme } from "./useAdminTheme";
import { api, type AppNotification } from "../api";

function timeAgo(iso: string): string {
  const then = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z")).getTime();
  if (Number.isNaN(then)) return "";
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export default function Topbar({
  username,
  theme,
  onToggleTheme,
  onAccount,
  onLogout,
  onToggleSidebar,
  onNavigate,
}: {
  username: string;
  theme: AdminTheme;
  onToggleTheme: () => void;
  onAccount: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  onNavigate?: (section: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotifs = useCallback(async () => {
    try {
      const { items, unread } = await api.listNotifications();
      setNotifs(items);
      setUnread(unread);
    } catch {
      /* silencioso: notificações não devem atrapalhar o painel */
    }
  }, []);

  // Busca inicial + polling a cada 45s.
  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 45000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!bellOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [bellOpen]);

  const openBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    // Ao abrir com não-lidas, marca todas como lidas (zera o contador).
    if (next && unread > 0) {
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: 1 })));
      await api.markNotificationsRead().catch(() => {});
    }
  };

  const clickNotif = (n: AppNotification) => {
    setBellOpen(false);
    if (n.link && n.link.startsWith("#") && onNavigate) onNavigate(n.link.slice(1));
  };

  return (
    <header className={s.topbar}>
      <button className={`${s.iconButton} ${s.mobileMenuBtn}`} onClick={onToggleSidebar} aria-label="Menu">
        <IcMenu />
      </button>

      <div className={s.search}>
        <IcSearch />
        <input className={s.searchInput} placeholder="Buscar clientes, propostas, briefings…" />
      </div>

      <div className={s.topbarRight}>
        <button className={s.iconButton} onClick={onToggleTheme} aria-label="Alternar tema">
          {theme === "light" ? <IcMoon /> : <IcSun />}
        </button>

        <div className={s.menuRel} ref={bellRef}>
          <button className={s.iconButton} onClick={openBell} aria-label="Notificações" style={{ position: "relative" }}>
            <IcBell />
            {unread > 0 && (
              <span
                style={{
                  position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 8, background: "#e5484d", color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className={s.menu} style={{ width: 340, maxHeight: 440, overflowY: "auto", padding: 0 }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>
                Notificações
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding: "22px 14px", fontSize: 13, opacity: 0.6, textAlign: "center" }}>
                  Nenhuma notificação ainda.
                </div>
              ) : (
                notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => clickNotif(n)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "11px 14px",
                      borderBottom: "1px solid var(--color-border)", background: "none", border: "none",
                      cursor: n.link ? "pointer" : "default", color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontSize: 13 }}>{n.type === "payment" ? "💰" : n.type === "signature" ? "✍️" : "🔔"}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{n.title}</span>
                      <span style={{ fontSize: 10, opacity: 0.5, whiteSpace: "nowrap" }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.body && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3, marginLeft: 21 }}>{n.body}</div>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className={s.menuRel} ref={menuRef}>
          <button className={s.userChip} onClick={() => setMenuOpen((o) => !o)}>
            <img src="/assets/images/hero-photo.webp" alt="" className={s.userAvatar} />
            <span>
              <span className={s.userName}>{username}</span>
              <span className={s.userRole} style={{ display: "block" }}>Administradora</span>
            </span>
            <IcChevronDown />
          </button>

          {menuOpen && (
            <div className={s.menu}>
              <button className={s.menuItem} onClick={() => { setMenuOpen(false); onAccount(); }}>
                <IcLock /> Minha conta
              </button>
              <a className={s.menuItem} href="/" target="_blank" rel="noopener noreferrer">
                <IcExternal /> Ver site
              </a>
              <button className={s.menuItem} onClick={() => { setMenuOpen(false); onLogout(); }}>
                <IcLogout /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
