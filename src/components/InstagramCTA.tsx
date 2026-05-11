import styles from './InstagramCTA.module.css'

const INSTAGRAM_URL = 'https://www.instagram.com/isapaulinostudio/'

const photos = [
  { src: '/assets/instagram/1.jpg', alt: 'Instagram Post 1' },
  { src: '/assets/instagram/2.jpg', alt: 'Instagram Post 2' },
  { src: '/assets/instagram/3.jpg', alt: 'Instagram Post 3' },
  { src: '/assets/instagram/4.jpg', alt: 'Instagram Post 4' },
]

export default function InstagramCTA() {
  return (
    <section className={styles.instaCTA}>
      <div className={styles.header}>
        <div className={styles.divider}></div>
        <h2 className={styles.title}>
          QUER VER DE PERTO<br />
          <span className={styles.titleMuted}>COMO TUDO ACONTECE</span><br />
          POR AQUI?
        </h2>
        <p className={styles.subtitle}>
          Acompanhe bastidores, processos, detalhes técnicos e resultados dos projetos no Instagram.
        </p>
        
        <div className={styles.profileRow}>
          <img src="/assets/images/hero-photo.jpg" alt="@IsaPaulinoStudio" className={styles.profilePic} />
          <span className={styles.handle}>@IsaPaulinoStudio</span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`btn btn-outline-sm ${styles.followBtnCTA}`} style={{ marginLeft: '10px' }}>
            Seguir
          </a>
        </div>
      </div>

      <div className={styles.grid}>
        {photos.map((photo, index) => (
          <a
            key={index}
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.gridItem} ${index === 0 ? styles.gridItemFirst : ''} ${index === photos.length - 1 ? styles.gridItemLast : ''}`}
          >
            <img src={photo.src} alt={photo.alt} className={styles.gridImg} />
            <div className={styles.gridOverlay}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/>
              </svg>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
