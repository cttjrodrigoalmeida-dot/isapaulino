import { useState } from 'react'
import styles from './Portfolio.module.css'

const portfolioItems = [
  {
    id: 1,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (1).webp',
    title: 'QUARTO INFANTIL',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'ARCHICAD']
  },
  {
    id: 2,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (2).webp',
    title: 'DOIS BANHEIROS',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ISABELLA SERRANO',
    tags: ['EXECUTIVO', 'ÁREA MOLHADA', 'ARCHICAD']
  },
  {
    id: 3,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (3).webp',
    title: 'COZINHA MINIMALISTA',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ÉGINA QUEIROZ',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  },
  {
    id: 4,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (4).webp',
    title: 'APARTAMENTO 25m²',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ISABELLA SERRANO',
    tags: ['DETALHAMENTO', 'ÁREA MOLHADA', 'ARCHICAD']
  },
  {
    id: 5,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (5).webp',
    title: 'KOHGA HA KUROKAWA RYU',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['EXECUTIVO', 'ARQUITETURA', 'AUTOCAD']
  },
  {
    id: 6,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (6).webp',
    title: 'COZINHA CLÁSSICA',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. CAROL BEDIN',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'LAYOUT']
  },
  {
    id: 7,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (7).webp',
    title: 'LASH DESIGN',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  },
  {
    id: 8,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (8).webp',
    title: 'FAZENDA LACIARA',
    description: '',
    stat: 'AUTORA DO PROJETO: ENG. LANA DRIENLLE',
    tags: ['EXECUTIVO', 'PAISAGISMO', 'AUTOCAD']
  },
  {
    id: 9,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (9).webp',
    title: 'VILA SAVANA',
    description: '',
    stat: 'AUTOR DO PROJETO: OARK STUDIO',
    tags: ['EXECUTIVO', 'ARQUITETURA', 'AUTOCAD']
  },
  {
    id: 10,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (10).webp',
    title: 'APARTAMENTO 65m²',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ANA ARAÚJO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  },
  {
    id: 11,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (11).webp',
    title: 'CAFÉ FIORI',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'INTERIORES', 'AUTOCAD']
  },
  {
    id: 12,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (12).webp',
    title: 'RANCHO DO LEISON',
    description: '',
    stat: 'AUTOR DO PROJETO: ENG. LEISON MARTINS',
    tags: ['EXECUTIVO', 'ARQUITETURA', 'AUTOCAD']
  },
  {
    id: 13,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (13).webp',
    title: 'COZINHA CLÁSSICA',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  },
  {
    id: 14,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (14).webp',
    title: 'PROJETO RESIDENCIAL',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ISABELA PAULINO',
    tags: ['EXECUTIVO', 'INTERIORES', 'AUTOCAD']
  },
  {
    id: 15,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (15).webp',
    title: 'APARTAMENTO 70m²',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ISABELLA SERRANO',
    tags: ['EXECUTIVO', 'PAGINAÇÃO', 'ARCHICAD']
  },
  {
    id: 16,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (16).webp',
    title: 'CASACOR BANHEIRO',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'ÁREA MOLHADA', 'AUTOCAD']
  },
  {
    id: 17,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (17).webp',
    title: 'COZINHA CLÁSSICA',
    description: '',
    stat: 'AUTOR DO PROJETO: OARK STUDIO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  },
  {
    id: 18,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (18).webp',
    title: 'BAR HIGH LIVING - KZULO',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'INTERIORES', 'AUTOCAD']
  },
  {
    id: 19,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (19).webp',
    title: 'CLÍNICA DR. PAULO FERNANDO',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. ISABELLA SERRANO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  },
  {
    id: 20,
    src: '/assets/portfolio/PRANCHA PORTFOLIOS (20).webp',
    title: 'HOME OFFICE',
    description: '',
    stat: 'AUTORA DO PROJETO: ARQ. GRACE SANTIAGO',
    tags: ['DETALHAMENTO', 'MARCENARIA', 'AUTOCAD']
  }
]

export default function Portfolio() {
  const [visibleCount, setVisibleCount] = useState(4)

  const handleShowMore = (e: React.MouseEvent) => {
    e.preventDefault()
    setVisibleCount(portfolioItems.length)
  }

  const handleShowLess = () => {
    setVisibleCount(4)
    setTimeout(() => {
      const section = document.getElementById('projetos')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    }, 50)
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
            <button onClick={handleShowMore} className="btn btn-outline">
              Mostrar mais
            </button>
          ) : (
            <button onClick={handleShowLess} className="btn btn-outline">
              Mostrar menos
            </button>
          )}
        </div>


      </div>
    </section>
  )
}
