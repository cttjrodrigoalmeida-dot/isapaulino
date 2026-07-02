import { useEffect, useRef, useState } from "react";
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

export default function Topbar({
  username,
  theme,
  onToggleTheme,
  onChangePassword,
  onLogout,
  onToggleSidebar,
}: {
  username: string;
  theme: AdminTheme;
  onToggleTheme: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

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
        <button className={s.iconButton} aria-label="Notificações">
          <IcBell />
        </button>

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
              <button className={s.menuItem} onClick={() => { setMenuOpen(false); onChangePassword(); }}>
                <IcLock /> Alterar senha
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
