import s from "./Dashboard.module.css";
import { SECTIONS, type SectionId } from "./sections";

export default function Sidebar({
  active,
  onSelect,
  open,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  open: boolean;
}) {
  return (
    <aside className={`${s.sidebar} ${open ? s.sidebarOpen : ""}`}>
      <div className={s.sidebarBrand}>
        <img src="/assets/images/hero-photo.webp" alt="" className={s.sidebarLogo} />
        <div>
          <div className={s.sidebarBrandName}>ISABELA PAULINO</div>
          <div className={s.sidebarBrandSub}>Painel do estúdio</div>
        </div>
      </div>

      {SECTIONS.map((sec, i) => {
        const Icon = sec.icon;
        // Cabeçalho da categoria quando ela muda em relação ao item anterior.
        const prevCat = i > 0 ? SECTIONS[i - 1].category : undefined;
        const showHeader = !!sec.category && sec.category !== prevCat;
        return (
          <div key={sec.id}>
            {showHeader && <div className={s.navCategory}>{sec.category}</div>}
            <button
              className={`${s.navItem} ${active === sec.id ? s.navItemActive : ""}`}
              onClick={() => onSelect(sec.id)}
            >
              <span className={s.navIcon}>
                <Icon />
              </span>
              <span>
                <span className={s.navLabel}>{sec.label}</span>
                <span className={s.navSub}>{sec.sub}</span>
              </span>
            </button>
          </div>
        );
      })}
    </aside>
  );
}
