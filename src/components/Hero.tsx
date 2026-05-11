import { useEffect, useRef } from 'react'
import styles from './Hero.module.css'

// Animated counter hook
function useCountUp(target: number, duration = 1800, prefix = '', suffix = '') {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic
      const value = Math.floor(eased * target)
      el.textContent = `${prefix}${value}${suffix}`
      if (progress < 1) requestAnimationFrame(step)
    }

    // Use IntersectionObserver to start when visible
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          requestAnimationFrame(step)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, prefix, suffix])

  return ref
}

export default function Hero() {
  const ref200 = useCountUp(200, 1800, '+', '')
  const ref6 = useCountUp(6, 1400, '+', '')
  const ref100 = useCountUp(100, 2000, '', '%')

  return (
    <section id="inicio" className={styles.hero}>
      {/* Background grid */}
      <div className={styles.bgGrid} aria-hidden="true" />

      {/* Main content */}
      <div className={`${styles.heroContent} container`}>
        {/* Left column */}
        <div className={styles.left}>
          {/* Tag line */}
          <div className={styles.tagLine}>
            <span className={styles.tagDot} />
            <span className="text-label">ARQUITETURA / DETALHAMENTO TÉCNICO / TERCEIRIZAÇÃO</span>
          </div>

          {/* Main heading */}
          <h1 className={styles.heading}>
            <span className={styles.headingLine}>TERCEIRIZE</span>
            <span className={styles.headingLine}>SEU PROJETO</span>
            <span className={styles.headingLine}>COM QUEM</span>
            <span className={`${styles.headingLine} ${styles.headingAccent}`}>VIVE O</span>
            <span className={`${styles.headingLine} ${styles.headingAccent}`}>DETALHE</span>
          </h1>

          {/* Subtitle */}
          <p className={styles.heroSubtitle}>
            Se o detalhamento está travando seu projeto, acumulando decisões e apertando seu prazo, você sabe o quanto isso impacta a rotina do seu escritório.<br></br> É exatamente nesse ponto que eu entro.
          </p>

          {/* CTA buttons */}
          <div className={styles.ctaGroup}>
            <a href="#contato" className={`btn btn-outline ${styles.ctaBtn}`} id="hero-cta">
              Me manda seu projeto
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#projetos" className={styles.viewWork}>
              <span className="text-label">Ver Projetos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span ref={ref200} className={styles.statValue}>+0</span>
              <span className={styles.statLabel}>Projetos entregues</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span ref={ref6} className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Anos de experiência</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span ref={ref100} className={styles.statValue}>0%</span>
              <span className={styles.statLabel}>Clientes satisfeitos</span>
            </div>
          </div>
        </div>

        {/* Right column — Expert photo */}
        <div className={styles.right}>
          <div className={styles.photoContainer}>
            {/* Decorative corner accent (hidden) */}
            <div className={styles.cornerAccent} aria-hidden="true" />

            <img
              src="/assets/images/hero-photo.jpg"
              alt="Isabela Paulino — Arquiteta e Designer de Interiores"
              className={styles.heroPhoto}
            />

            {/* Floating badge */}
            <div className={styles.floatingBadge}>
              <span className={styles.badgeTitle}>Isabela Paulino</span>
              <span className={styles.badgeRole}>Arquiteta / CAU A313396-6</span>
            </div>
            
            {/* Tools List */}
            <div className={styles.heroTools}>
              <span className="text-label">AUTOCAD &bull; ARCHICAD &bull; SKETCHUP LAYOUT &bull; REVIT</span>
            </div>
          </div>

          {/* Animated Scroll indicator */}
          <div className={styles.scrollIndicatorWrapper}>
            <span className={styles.scrollTextVertical}>SCROLL</span>
            <div className={styles.scrollChevrons}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" className={styles.chevron1}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" className={styles.chevron2}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.heroBottom}>
        <div className="container">
          <div className={styles.heroBottomInner}>
            <span className="text-label">Isabela Paulino</span>
            <div className={styles.heroSeparator} />
            <span className="text-label">CAU A313396-6</span>
            <div className={styles.heroSeparator} />
            <span className="text-label">Goiás · Brasil</span>
          </div>
        </div>
      </div>
    </section>
  )
}
