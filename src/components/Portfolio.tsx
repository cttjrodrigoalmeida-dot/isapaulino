import { useState } from 'react'
import styles from './Portfolio.module.css'

const portfolioItems = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  src: `/assets/portfolio/PRANCHA PORTFOLIOS (${i + 1}).webp`,
  title: 'PROJETO EXECUTIVO',
  description: 'Detalhamento técnico completo, focado em precisão e alinhamento estético para execução.',
  stat: `Prancha ${String(i + 1).padStart(2, '0')}`,
  tags: ['Executivo', 'Detalhamento', 'Layout']
}))

export default function Portfolio() {
  const [visibleCount, setVisibleCount] = useState(4)

  const handleShowMore = (e: React.MouseEvent) => {
    e.preventDefault()
    setVisibleCount(portfolioItems.length)
  }

  return (
    <section id="projetos" className={styles.portfolioSection}>
      <div className="container">
        {/* Header */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>
            PROJETO PRONTO <span className={styles.titleAccent}>PARA<br />
            EXECUÇÃO</span> COMEÇA NO DETALHE.
          </h2>
          <p className={styles.subtitle}>
            Cada projeto abaixo mostra um pouco de como o detalhamento, a imagem e a<br />
            apresentação podem transformar uma ideia em algo mais claro, técnico e executável.
          </p>
        </div>

        <div className={styles.projectsGrid}>
          {portfolioItems.slice(0, visibleCount).map((item) => {
            return (
              <div key={item.id} className={styles.projectCard}>
                
                {/* Imagem de Fundo (que vai encolher no hover) */}
                <div className={styles.imageWrapper}>
                  <img src={item.src} alt={item.title} className={styles.projectImage} />
                  
                  {/* Overlay Escuro sobre a imagem para dar contraste */}
                  <div className={styles.imageOverlay}></div>
                </div>

                {/* Tab Superior Direito (Hover) */}
                <div className={styles.statTab}>
                  {item.stat}
                </div>

                {/* Painel Inferior (Hover) */}
                <div className={styles.infoPanel}>
                  <div className={styles.infoText}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <div className={styles.tags}>
                    {item.tags.map(tag => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>

              </div>
            )
          })}
        </div>

        {/* Mostrar mais / menos CTA */}
        <div className={styles.ctaWrapper}>
          {visibleCount < portfolioItems.length ? (
            <button onClick={handleShowMore} className={styles.showMoreBtn}>
              Mostrar mais...
            </button>
          ) : (
            <button
              onClick={() => {
                const section = document.getElementById('projetos')
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setTimeout(() => setVisibleCount(4), 400)
              }}
              className={styles.showMoreBtn}
            >
              Mostrar menos
            </button>
          )}
        </div>


      </div>
    </section>
  )
}
