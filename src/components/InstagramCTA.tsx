import styles from './InstagramCTA.module.css'

export default function InstagramCTA() {
  return (
    <section className={styles.instaCTA}>
      <div className={styles.header}>
        <div className={styles.divider}></div>
        <h2 className={styles.title}>Quer ver de perto como tudo acontece por aqui?</h2>
        <p className={styles.subtitle}>
          Acompanhe bastidores, processos, detalhes técnicos e resultados dos projetos no Instagram.
        </p>
        
        <div className={styles.profileRow}>
          <img src="/assets/images/hero-photo.jpg" alt="@IsaPaulinoStudio" className={styles.profilePic} />
          <span className={styles.handle}>@IsaPaulinoStudio</span>
          <a href="https://www.instagram.com/isapaulinostudio/" target="_blank" rel="noopener noreferrer" className={`btn btn-outline-sm ${styles.followBtnCTA}`} style={{ marginLeft: '10px' }}>
            Seguir
          </a>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.gridItem} ${styles.gridItemFirst}`}>
          <img src="/assets/portfolio/1.jpg" alt="Instagram Post 1" className={styles.gridImg} />
        </div>
        <div className={styles.gridItem}>
          <img src="/assets/portfolio/2.jpg" alt="Instagram Post 2" className={styles.gridImg} />
        </div>
        <div className={styles.gridItem}>
          <img src="/assets/portfolio/3.jpg" alt="Instagram Post 3" className={styles.gridImg} />
        </div>
        <div className={`${styles.gridItem} ${styles.gridItemLast}`}>
          <img src="/assets/portfolio/4.jpg" alt="Instagram Post 4" className={styles.gridImg} />
        </div>
      </div>
    </section>
  )
}
