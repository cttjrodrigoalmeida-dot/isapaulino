import styles from './Portfolio.module.css'

const portfolioItems = [
  { 
    id: 1, 
    src: '/assets/portfolio/1.jpg', 
    title: 'SafeRide',
    description: "Redesigned a healthcare provider's patient...",
    stat: '41% increase in prescription refill completion rate',
    tags: ['UI/UX Designer', 'Travel']
  },
  { 
    id: 2, 
    src: '/assets/portfolio/2.jpg', 
    title: 'SafeRide',
    description: "Redesigned a healthcare provider's patient...",
    stat: '41% increase in prescription refill completion rate',
    tags: ['UI/UX Designer', 'Travel']
  },
  { 
    id: 3, 
    src: '/assets/portfolio/3.jpg', 
    title: 'SafeRide',
    description: "Redesigned a healthcare provider's patient...",
    stat: '41% increase in prescription refill completion rate',
    tags: ['UI/UX Designer', 'Travel']
  },
  { 
    id: 4, 
    src: '/assets/portfolio/4.jpg', 
    title: 'SafeRide',
    description: "Redesigned a healthcare provider's patient...",
    stat: '41% increase in prescription refill completion rate',
    tags: ['UI/UX Designer', 'Travel']
  },
]

export default function Portfolio() {
  return (
    <section id="projetos" className={styles.portfolioSection}>
      <div className="container">
        {/* Header */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>
            UM <span className={styles.titleBold}>PROJETO PRONTO</span> PARA<br />
            EXECUÇÃO COMEÇA NO DETALHE.
          </h2>
          <p className={styles.subtitle}>
            Cada projeto abaixo mostra um pouco de como o detalhamento, a imagem e a<br />
            apresentação podem transformar uma ideia em algo mais claro, técnico e executável.
          </p>
        </div>

        <div className={styles.projectsGrid}>
          {portfolioItems.map((item) => {
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

        {/* Mostrar mais CTA */}
        <div className={styles.ctaWrapper}>
          <a href="#contato" className={styles.showMoreBtn}>
            Mostrar mais...
          </a>
        </div>
      </div>
    </section>
  )
}
