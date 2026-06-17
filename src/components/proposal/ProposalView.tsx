import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Proposal } from "./types";
import {
  DEFAULT_CONTACT,
  DEFAULT_STUDIO_ABOUT,
  DEFAULT_PROCESS_STEPS,
  DEFAULT_CLAUSES,
  DEFAULT_NOT_INCLUDED,
} from "./proposalDefaults";
import { faqs } from "../FAQ";
import styles from "./ProposalView.module.css";

// ── Reveal on scroll ──────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}

// ── Seção colapsável SOMENTE no mobile ─────────────────────────
// No desktop renderiza tudo aberto (sem chevron, sem clique).
// No mobile o cabeçalho vira um toggle, como em "Condições Gerais".
function MobileCollapsible({
  isDesktop,
  header,
  children,
  defaultOpen = false,
}: {
  isDesktop: boolean;
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = isDesktop || open;
  const toggle = () => setOpen((o) => !o);
  return (
    <>
      <div
        className={styles.mCollapseHead}
        onClick={isDesktop ? undefined : toggle}
        role={isDesktop ? undefined : "button"}
        tabIndex={isDesktop ? undefined : 0}
        aria-expanded={isDesktop ? undefined : isOpen}
        onKeyDown={
          isDesktop
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }
        }
      >
        <div className={styles.mCollapseHeadMain}>{header}</div>
        <span
          className={`${styles.mCollapseChevron} ${
            open ? styles.mCollapseChevronOpen : ""
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {isOpen && children}
    </>
  );
}

// ── Contador animado (count-up) — réplica da hero do site ──────
function useCountUp(target: number, duration = 1800, prefix = "", suffix = "") {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startTime: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${prefix}${Math.floor(eased * target)}${suffix}`;
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          raf = requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration, prefix, suffix]);
  return ref;
}

// ── Ícones inline (sem dependências externas) ─────────────────
const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5c3 3.2 3 16 0 19M12 2.5c-3 3.2-3 16 0 19" />
  </svg>
);
const IconTikTok = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" />
  </svg>
);
const IconPinterest = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
const IconArrowUp = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.3 12.4l2.5 2.5 4.9-5.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.7v.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPix = () => (
  <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden>
    <path d="M16 2.6l4.7 4.7-4.7 4.7-4.7-4.7L16 2.6zM7.3 11.3l4.7 4.7-4.7 4.7L2.6 16l4.7-4.7zm17.4 0L29.4 16l-4.7 4.7L20 16l4.7-4.7zM16 20l4.7 4.7L16 29.4l-4.7-4.7L16 20z" />
  </svg>
);

// ── Contador regressivo até o vencimento da proposta ──────────
function Countdown({ until }: { until: string }) {
  const target = new Date(until).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (Number.isNaN(target)) return null;
  const diff = target - now;
  if (diff <= 0) {
    return (
      <span className={`${styles.countdown} ${styles.countdownExpired}`}>
        Proposta expirada
      </span>
    );
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const parts = [
    ...(d > 0 ? [`${d}d`] : []),
    `${p2(h)}h`,
    `${p2(m)}m`,
    `${p2(s)}s`,
  ];
  return (
    <span className={styles.countdown}>
      <span className={styles.countdownDot} aria-hidden />
      Faltam {parts.join(" ")}
    </span>
  );
}

interface Props {
  proposal: Proposal;
}

export default function ProposalView({ proposal: p }: Props) {
  const contact = p.contact ?? DEFAULT_CONTACT;
  const about = p.studioAbout ?? DEFAULT_STUDIO_ABOUT;
  const aboutExtra = DEFAULT_STUDIO_ABOUT; // credenciais/ferramentas vêm sempre dos defaults
  const steps = p.processSteps ?? DEFAULT_PROCESS_STEPS;
  const clauses = p.clauses ?? DEFAULT_CLAUSES;
  const notIncluded = p.notIncluded ?? DEFAULT_NOT_INCLUDED;
  const show = {
    about: p.show?.about ?? true,
    process: p.show?.process ?? true,
    clauses: p.show?.clauses ?? true,
    notIncluded: p.show?.notIncluded ?? true,
  };

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  // ── Portfólio: "Ver Mais" + lightbox (ampliar — somente desktop) ──
  const GALLERY_INITIAL = 4;
  const gallery = p.gallery ?? [];
  const visibleGallery = gallery.slice(0, GALLERY_INITIAL);

  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 992px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const [lightbox, setLightbox] = useState<string | null>(null);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const [clausesOpen, setClausesOpen] = useState(false);
  const clausesSectionRef = useRef<HTMLElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // stats animados (igual à hero do site)
  const ref200 = useCountUp(200, 1800, "+", "");
  const ref6 = useCountUp(6, 1400, "+", "");
  const ref100 = useCountUp(100, 2000, "", "%");

  const waLink = `https://wa.me/${contact.whatsapp}`;
  const ctaWaLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    `Olá, Isabela! Tenho interesse na proposta Nº ${p.number} e gostaria de seguir para o contrato.`
  )}`;

  return (
    <div className={styles.page}>
      {/* fundo ambiente sutil (fixo) + glows de destaque */}
      <div className={styles.ambient} aria-hidden />
      <div className={styles.glowTop} aria-hidden />
      <div className={styles.glowBottom} aria-hidden />

      {/* redes sociais fixas no canto superior direito (desktop) — 2x2 */}
      <div className={styles.socialFixed}>
        {contact.instagram && (
          <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="Instagram">
            <IconInstagram />
          </a>
        )}
        <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="Site">
          <IconGlobe />
        </a>
        {contact.tiktok && (
          <a href={`https://tiktok.com/@${contact.tiktok}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="TikTok">
            <IconTikTok />
          </a>
        )}
        {contact.pinterest && (
          <a href={`https://pinterest.com/${contact.pinterest}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="Pinterest">
            <IconPinterest />
          </a>
        )}
      </div>

      {/* ───────────── CAPA ───────────── */}
      <header className={styles.hero}>
        <div className={styles.heroTopbar}>
          <img
            src="/assets/logo-parasite.webp"
            alt="Isabela Paulino Studio"
            className={styles.heroLogo}
          />
        </div>

        <div className={styles.heroBody}>
          <Reveal>
            <SectionLabel>PROPOSTA DE ORÇAMENTO · Nº {p.number}</SectionLabel>
            <h1 className={styles.heroTitle}>{p.serviceTitle}</h1>
            <div className={styles.heroTags}>
              {p.serviceTags.map((t) => (
                <span key={t} className={styles.tag}>
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className={styles.heroMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Cliente</span>
                <span className={styles.metaValue}>{p.client}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Data</span>
                <span className={styles.metaValue}>{p.date}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Validade</span>
                <span className={styles.metaValue}>{p.validity}</span>
                {p.validUntil && <Countdown until={p.validUntil} />}
              </div>
            </div>
          </Reveal>
        </div>
        <span className={styles.heroFootnote}>
          ISABELA PAULINO STUDIO · TODOS OS DIREITOS RESERVADOS
        </span>
      </header>

      <main className={styles.container}>
        {/* ───────────── SOBRE O ESTÚDIO ───────────── */}
        {show.about && (
          <section className={styles.section}>
            <Reveal>
              <SectionLabel>{about.eyebrow}</SectionLabel>
            </Reveal>
            <Reveal className={styles.aboutGrid}>
              <div className={styles.aboutText}>
                <h2 className={styles.aboutTitle}>
                  {about.titleLines.map((line, i) => (
                    <span key={i} className={styles.aboutTitleLine}>
                      {line}
                    </span>
                  ))}
                </h2>
                {about.paragraphs.map((para, i) => (
                  <p key={i} className={styles.paragraph}>
                    {para}
                  </p>
                ))}

                {/* stats da hero do site */}
                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <span ref={ref200} className={styles.statValue}>+0</span>
                    <span className={styles.statLabel}>Projetos entregues</span>
                  </div>
                  <span className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span ref={ref6} className={styles.statValue}>+0</span>
                    <span className={styles.statLabel}>Anos de experiência</span>
                  </div>
                  <span className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span ref={ref100} className={styles.statValue}>0%</span>
                    <span className={styles.statLabel}>Clientes satisfeitos</span>
                  </div>
                </div>
              </div>

              {about.photo && (
                <div className={styles.aboutMedia}>
                  <div className={styles.photoContainer}>
                    <span className={styles.cornerAccent} aria-hidden />
                    <span className={styles.lineRight} aria-hidden />
                    <span className={styles.lineBottom} aria-hidden />
                    <img src={about.photo} alt="Isabela Paulino" className={styles.aboutPhoto} />
                    {/* card flutuante sobre a foto (igual à hero) */}
                    <div className={styles.badgeCard}>
                      <span className={styles.badgeCardTitle}>{aboutExtra.name}</span>
                      <span className={styles.badgeCardRole}>{aboutExtra.credentials}</span>
                    </div>
                  </div>
                  {/* ferramentas — abaixo da foto, alinhadas à esquerda */}
                  <div className={styles.photoTools}>
                    <span className={styles.miniLabel}>FERRAMENTAS QUE UTILIZAMOS</span>
                    <div className={styles.toolRow}>
                      {aboutExtra.tools.map((t) => (
                        <span key={t} className={styles.tool}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Reveal>
          </section>
        )}

        {/* ───────────── CARTA / ESCOPO ───────────── */}
        <section className={styles.section}>
          <Reveal className={styles.letterCard}>
            <span className={styles.letterHey}>
              Hey {p.clientFirstName}, tudo bem?
            </span>
            <p className={styles.letterIntro}>{p.scopeIntro}</p>
            {p.scopeNote && <p className={styles.paragraph}>{p.scopeNote}</p>}

            {p.ambientes.length > 0 && (
              <>
                <span className={styles.miniLabel}>Ambientes do escopo</span>
                <div className={styles.chips}>
                  {p.ambientes.map((a) => (
                    <span key={a} className={styles.chip}>
                      {a}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Reveal>
        </section>

        {/* ───────────── PORTFÓLIO / TRABALHOS ANTERIORES ───────────── */}
        {gallery.length > 0 && (
          <section className={styles.section}>
            <Reveal>
              <SectionLabel>PORTFÓLIO</SectionLabel>
              {(() => {
                const title = p.galleryTitle ?? "Projetos anteriores";
                const [first, ...rest] = title.split(" ");
                return (
                  <h2 className={styles.h2}>
                    {first}
                    {rest.length > 0 && (
                      <span className={styles.h2Muted}> {rest.join(" ")}</span>
                    )}
                  </h2>
                );
              })()}
              {p.galleryIntro && <p className={styles.paragraph}>{p.galleryIntro}</p>}
            </Reveal>
            <div className={styles.galleryGrid}>
              {visibleGallery.map((item, i) => (
                <Reveal key={i} delay={(i % 2) * 0.08} className={styles.galleryItem}>
                  <div
                    className={`${styles.galleryImageWrap} ${
                      isDesktop ? styles.galleryZoomable : ""
                    }`}
                    onClick={() => isDesktop && setLightbox(item.image)}
                  >
                    <img
                      src={item.image}
                      alt={`Projeto ${i + 1}`}
                      className={styles.galleryImage}
                      loading="lazy"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
            <div className={styles.galleryMoreRow}>
              <a
                href={`https://instagram.com/${contact.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Ver Mais
              </a>
            </div>
          </section>
        )}

        {/* ───────────── PROCESSO ───────────── */}
        {show.process && (
          <section className={styles.section}>
            <MobileCollapsible
              isDesktop={isDesktop}
              header={
                <Reveal>
                  <SectionLabel>COMO FUNCIONA</SectionLabel>
                  <h2 className={styles.h2}>
                    <span className={styles.titleLine}>
                      <span className={styles.h2Muted}>O </span>PROCESSO
                      <span className={styles.h2Muted}> DE</span>
                    </span>
                    <span className={`${styles.titleLine} ${styles.h2Muted}`}>
                      DETALHAMENTO EXECUTIVO
                    </span>
                  </h2>
                </Reveal>
              }
            >
              <div className={styles.stepsGrid}>
                {steps.map((step, i) => (
                  <Reveal key={step.number} delay={i * 0.08} className={styles.stepCard}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <ul className={styles.stepList}>
                      {step.items.map((item, j) => (
                        <li key={j} className={styles.stepItem}>
                          <span className={styles.bullet} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    {step.note && <p className={styles.stepNote}>{step.note}</p>}
                  </Reveal>
                ))}
              </div>
            </MobileCollapsible>
          </section>
        )}

        {/* ───────────── INVESTIMENTO ───────────── */}
        <section className={styles.section}>
          <Reveal>
            <SectionLabel>INVESTIMENTO</SectionLabel>
            <h2 className={styles.h2}>Investimento do projeto</h2>
            {p.investimentoIntro && (
              <p className={styles.paragraph}>{p.investimentoIntro}</p>
            )}
          </Reveal>

          <div className={styles.investGrid}>
            {p.investmentBlocks.map((block, i) => (
              <Reveal key={block.title} delay={i * 0.1} className={styles.investCard}>
                <div className={styles.investHead}>
                  <h3 className={styles.investTitle}>{block.title}</h3>
                  {block.subtitle && (
                    <span className={styles.investSub}>{block.subtitle}</span>
                  )}
                </div>
                <ul className={styles.priceList}>
                  {block.lines.map((line) => (
                    <li key={line.label} className={styles.priceRow}>
                      <span className={styles.priceLabel}>{line.label}</span>
                      <span className={styles.dots} aria-hidden />
                      <span className={styles.priceValue}>{line.value}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.investSubtotal}>
                  <span>Subtotal</span>
                  <span className={styles.investSubtotalValue}>{block.subtotal}</span>
                </div>
                {block.discountNote && (
                  <p className={styles.discountNote}>{block.discountNote}</p>
                )}
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className={styles.totalCard}>
            {p.comboNote && (
              <div className={styles.comboBadge}>
                <span className={styles.comboStar}>★</span>
                <span className={styles.comboText}>{p.comboNote}</span>
              </div>
            )}
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Investimento total</span>
              <span className={styles.totalValue}>{p.total}</span>
            </div>
            <span className={styles.totalExtenso}>{p.totalExtenso}</span>
          </Reveal>

          {/* forma de pagamento — abaixo do total */}
          <Reveal delay={0.1} className={styles.payWrap}>
            <MobileCollapsible
              isDesktop={isDesktop}
              header={<SectionLabel>FORMA DE PAGAMENTO</SectionLabel>}
            >
            {p.pixPlan && p.installmentPlan ? (
              <>
                <div className={styles.payGrid}>
                  {/* Card 01 — PIX à vista (em destaque) */}
                  <div className={`${styles.payPlan} ${styles.payPlanGlow}`}>
                    <span className={styles.payPlanHead}>01 — Via PIX à vista</span>
                    <div className={styles.payPlanBody}>
                      <div className={styles.pixTop}>
                        <div className={styles.pixCol}>
                          <span className={styles.paySmallLabel}>Desconto</span>
                          <span className={styles.pixDiscount}>{p.pixPlan.discountLabel}</span>
                        </div>
                        <span className={styles.pixVDivider} aria-hidden />
                        <div className={styles.pixCol}>
                          <span className={styles.paySmallLabel}>Você economiza</span>
                          <span className={styles.pixSave}>{p.pixPlan.saveAmount}</span>
                          <span className={styles.pixSaveSub}>no pagamento à vista</span>
                        </div>
                      </div>
                      <div className={styles.pixInvest}>
                        <span className={styles.paySmallLabel}>Investimento</span>
                        <span className={styles.pixFrom}>{p.pixPlan.fromValue}</span>
                      </div>
                      <div>
                        <span className={styles.paySmallLabel}>Você paga</span>
                        <span className={styles.pixPay}>{p.pixPlan.payValue}</span>
                      </div>
                    </div>
                    {p.pixPlan.footnote && (
                      <div className={styles.payPlanFoots}>
                        <span className={styles.payPlanFoot}>
                          <IconCheck /> {p.pixPlan.footnote}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 02 — Parcelado */}
                  <div className={styles.payPlan}>
                    <span className={styles.payPlanHead}>
                      02 — Parcelado · {p.installmentPlan.headline}
                    </span>
                    <div className={styles.payPlanBody}>
                      <div className={styles.parcHead}>
                        <span>Opção</span>
                        <span>Valor da parcela</span>
                      </div>
                      <ul className={styles.parcList}>
                        {p.installmentPlan.rows.map((row) => (
                          <li key={row.label} className={styles.parcRow}>
                            <span className={styles.parcLabel}>{row.label}</span>
                            <span className={styles.dots} aria-hidden />
                            <span className={styles.parcValue}>{row.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {p.installmentPlan.notes && p.installmentPlan.notes.length > 0 && (
                      <div className={styles.payPlanFoots}>
                        {p.installmentPlan.notes.map((note) => (
                          <span key={note} className={styles.payPlanFoot}>
                            <IconCheck /> {note}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* barra da chave PIX */}
                <div className={styles.pixBar}>
                  <div className={styles.pixBarRow}>
                    <div className={styles.pixBarKey}>
                      <span className={styles.pixBarIcon}>
                        <IconPix />
                      </span>
                      <div className={styles.pixBarText}>
                        <span className={styles.paySmallLabel}>Chave PIX</span>
                        <span className={styles.pixKey}>{p.pixKey}</span>
                      </div>
                    </div>
                    {p.pixReminder && (
                      <>
                        <span className={styles.pixBarVDivider} aria-hidden />
                        <span className={styles.pixBarNote}>
                          <IconInfo /> {p.pixReminder}
                        </span>
                      </>
                    )}
                  </div>
                  {p.paymentNote && (
                    <p className={styles.paymentNote}>{p.paymentNote}</p>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.payCard}>
                <div className={styles.pixBox}>
                  <span className={styles.miniLabel}>Chave PIX</span>
                  <span className={styles.pixKey}>{p.pixKey}</span>
                </div>
                <div className={styles.payOptions}>
                  {(p.paymentOptions ?? []).map((opt) => (
                    <div key={opt.title} className={styles.payOption}>
                      <span className={styles.payOptionTitle}>{opt.title}</span>
                      <span className={styles.payOptionDesc}>{opt.desc}</span>
                    </div>
                  ))}
                </div>
                {p.paymentNote && (
                  <p className={styles.paymentNote}>{p.paymentNote}</p>
                )}
              </div>
            )}
            </MobileCollapsible>
          </Reveal>
        </section>

        {/* ───────────── PRAZO ───────────── */}
        <section className={`${styles.section} ${styles.sectionTight}`}>
          <Reveal className={styles.prazoCard}>
            <SectionLabel>PRAZO DE ENTREGA</SectionLabel>
            <div className={styles.prazoRow}>
              <div className={styles.prazoItem}>
                <span className={styles.prazoNum}>{p.prazoDetalhamento}</span>
                <span className={styles.prazoCaption}>Detalhamento Executivo</span>
              </div>
              {p.prazoAnteprojeto && (
                <div className={styles.prazoItem}>
                  <span className={styles.prazoNum}>{p.prazoAnteprojeto}</span>
                  <span className={styles.prazoCaption}>Anteprojeto</span>
                </div>
              )}
              {p.availableDate && (
                <div className={`${styles.prazoItem} ${styles.prazoHighlight}`}>
                  <span className={styles.prazoNum}>{p.availableDate}</span>
                  <span className={styles.prazoCaption}>Disponível para iniciar</span>
                </div>
              )}
            </div>
            {p.prazoNote && (
              <p className={styles.prazoNote}>
                {p.prazoNote.startsWith("Importante:") ? (
                  <>
                    <strong>Importante:</strong>
                    {p.prazoNote.slice("Importante:".length)}
                  </>
                ) : (
                  p.prazoNote
                )}
              </p>
            )}
          </Reveal>
        </section>

        {/* ───────────── NÃO INCLUSOS ───────────── */}
        {show.notIncluded && (
          <section className={`${styles.section} ${styles.sectionTight}`}>
            <Reveal className={styles.notIncludedCard}>
              <MobileCollapsible
                isDesktop={isDesktop}
                header={<SectionLabel>O QUE NÃO ESTÁ INCLUSO</SectionLabel>}
              >
                <ul className={styles.notIncludedList}>
                  {notIncluded.map((item, i) => (
                    <li key={i} className={styles.notIncludedItem}>
                      <span className={styles.xmark}>×</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </MobileCollapsible>
            </Reveal>
          </section>
        )}

        {/* ───────────── PERGUNTAS FREQUENTES ───────────── */}
        <section className={`${styles.section} ${styles.sectionTight}`}>
          <MobileCollapsible
            isDesktop={isDesktop}
            header={
              <Reveal>
                <SectionLabel>TIRE SUAS DÚVIDAS</SectionLabel>
                <h2 className={styles.h2}>
                  <span className={styles.titleLine}>Perguntas</span>
                  <span className={`${styles.titleLine} ${styles.h2Muted}`}>Frequentes</span>
                </h2>
              </Reveal>
            }
          >
          <div className={styles.faqList}>
            {faqs.filter((_, i) => i !== 4).map((faq, idx) => (
              <div
                key={idx}
                className={`${styles.faqItem} ${
                  openFaq === idx ? styles.faqItemOpen : ""
                }`}
              >
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span className={styles.faqNum}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.faqQ}>{faq.q}</span>
                  <span className={styles.faqToggle}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`${styles.faqAnswer} ${
                    openFaq === idx ? styles.faqAnswerOpen : ""
                  }`}
                >
                  <p className={styles.faqAnswerText}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
          </MobileCollapsible>
        </section>

        {/* ───────────── CONDIÇÕES GERAIS (colapsável) ───────────── */}
        {show.clauses && (
          <section ref={clausesSectionRef} className={styles.section}>
            <Reveal>
              <SectionLabel>CONDIÇÕES GERAIS</SectionLabel>
              <h2 className={styles.h2}>
                <span className={styles.titleLine}>
                  CONDIÇÕES GERAIS<span className={styles.h2Muted}> PARA</span>
                </span>
                <span className={`${styles.titleLine} ${styles.h2Muted}`}>
                  PRESTAÇÃO DE SERVIÇOS
                </span>
              </h2>
              <p className={styles.paragraph}>
                As Condições Gerais funcionam como um resumo do contrato. Para manter a
                proposta limpa, o conteúdo completo fica disponível abaixo.
              </p>
              <button
                type="button"
                className={styles.clausesToggle}
                onClick={() => {
                  if (!clausesOpen) {
                    const y = window.scrollY;
                    setClausesOpen(true);
                    requestAnimationFrame(() =>
                      requestAnimationFrame(() => window.scrollTo(0, y))
                    );
                  } else {
                    setClausesOpen(false);
                  }
                }}
                aria-expanded={clausesOpen}
              >
                {clausesOpen
                  ? "Ocultar Condições Gerais"
                  : "Ver Condições Gerais para Prestação de Serviços"}
                <span
                  className={`${styles.clausesChevron} ${
                    clausesOpen ? styles.clausesChevronOpen : ""
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </Reveal>
            {clausesOpen && (
              <div className={styles.clauseList}>
                {clauses.map((c, i) => (
                  <div key={i} className={styles.clauseItem}>
                    <span className={styles.clauseNum}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.clauseBody}>
                      <h4 className={styles.clauseTitle}>{c.title}</h4>
                      <p className={styles.clauseText}>{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ───────────── CTA / VALIDADE / CONTATO ───────────── */}
        <section className={styles.section}>
          <Reveal className={styles.ctaCard}>
            <div className={styles.validityRow}>
              <span className={styles.validityBadge}>
                Orçamento válido por {p.validity}
              </span>
            </div>
            <h2 className={styles.ctaTitle}>
              <span className={styles.titleLine}>
                <span className={styles.h2Muted}>O </span>SEGREDO
                <span className={styles.h2Muted}> ESTÁ</span>
              </span>
              <span className={styles.titleLine}>
                <span className={styles.h2Muted}>NOS </span>DETALHES.
              </span>
            </h2>
            <p className={styles.ctaText}>
              Obrigada pela confiança. Para seguir, conversamos pelo WhatsApp e damos
              início ao <strong>contrato</strong> — onde ficam formalizados escopo,
              prazos, valores e condições de pagamento.
            </p>

            <a
              href={ctaWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaButton}
            >
              <IconWhatsApp />
              Aprovar e seguir para o contrato
            </a>
            <span className={styles.ctaHint}>
              Próximo passo: contrato digital · sem compromisso até a assinatura
            </span>

            <div className={styles.socialRow}>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className={styles.social}>
                <IconWhatsApp /> {contact.whatsappLabel}
              </a>
              <a
                href={`https://instagram.com/${contact.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.social}
              >
                <IconInstagram /> @{contact.instagram}
              </a>
              <a
                href={`https://${contact.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.social}
              >
                <IconGlobe /> {contact.website}
              </a>
              {contact.tiktok && (
                <a
                  href={`https://tiktok.com/@${contact.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.social}
                >
                  <IconTikTok /> @{contact.tiktok}
                </a>
              )}
              {contact.pinterest && (
                <a
                  href={`https://pinterest.com/${contact.pinterest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.social}
                >
                  <IconPinterest /> {contact.pinterest}
                </a>
              )}
            </div>
          </Reveal>
        </section>
      </main>

      <footer className={styles.footer}>
        <img
          src="/assets/logo-parasite.webp"
          alt="Isabela Paulino Studio"
          className={styles.footerLogo}
        />
        <span className={styles.footerNote}>
          ISABELA PAULINO STUDIO · DETALHAMENTO EXECUTIVO · {p.date}
        </span>
      </footer>

      {/* stack flutuante: WhatsApp (igual ao site) acima do botão Topo */}
      <div className={styles.floatStack}>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fale conosco pelo WhatsApp"
          className={styles.waFloat}
        >
          <img
            src="/assets/icons/whatsapp.webp"
            alt="WhatsApp"
            className={styles.waFloatIcon}
          />
        </a>
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Voltar ao topo"
          className={`${styles.backToTop} ${showTop ? styles.backToTopVisible : ""}`}
        >
          <IconArrowUp />
          <span>Topo</span>
        </button>
      </div>

      {/* lightbox — ampliação de imagem (somente desktop) */}
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
          >
            ×
          </button>
          <img
            src={lightbox}
            alt=""
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
