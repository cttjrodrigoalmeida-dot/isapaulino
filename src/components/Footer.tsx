import styles from './Footer.module.css'

const services = [
  'Projeto Executivo de Interiores',
  'Compatibilização de Projetos',
  'Detalhamento de Marcenaria e Marmoraria',
  'Detalhamento de Áreas Molhadas',
  'Plantas Técnicas para Execução',
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      {/* Top section */}
      <div className={styles.footerTop}>
        <div className="container">
          <div className={styles.footerGrid}>

            {/* Left Col: Logo & Info */}
            <div className={styles.leftCol}>
              <a href="#inicio" className={styles.footerLogo}>
                <img
                  src="/assets/logo-parasite.png"
                  alt="Isabela Paulino Studio"
                  className={styles.logoImg}
                />
              </a>
              <p className="text-body" style={{ maxWidth: 500, fontSize: '0.85rem', marginBottom: '32px' }}>
                Fundado em 2020 pela arquiteta Isabela Paulino, o estúdio é especializado em projetos executivos, detalhamento técnico e compatibilização. Com mais de 200 projetos realizados no Brasil e no exterior, transforma ideias em projetos prontos para execução.
              </p>

              <div className={styles.servicesAndContact}>
                <ul className={styles.servicesList}>
                  {services.map(s => (
                    <li key={s}>
                      <a href="#servicos" className={styles.footerLink}>{s}</a>
                    </li>
                  ))}
                </ul>

                <ul className={styles.contactList}>
                  <li>
                    <span className={styles.contactIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </span>
                    <span className={styles.contactValue}>Goiás, Brasil.</span>
                  </li>
                  <li>
                    <span className={styles.contactIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <a href="mailto:isapaulinastudio@gmail.com" className={styles.contactValue}>isapaulinostudio@gmail.com</a>
                  </li>
                  <li>
                    <span className={styles.contactIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </span>
                    <a href="https://wa.me/5562991942598" className={styles.contactValue}>+55 (62) 9 9194-2598</a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Middle Col: Socials */}
            <div className={styles.socialCol}>
              <a href="https://www.instagram.com/isapaulinostudio/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                  <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="http://wa.me/5562991942598" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" />
                </svg>
              </a>
              <a href="https://www.pinterest.com/isapaulinostudio" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Pinterest">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>
            </div>

            {/* Right Col: Map */}
            <div className={styles.mapCol}>
              <div className={styles.mapWrapper}>
                <img
                  src="/assets/footer-map.webp"
                  alt="Mapa Isabela Paulino Studio - Goiás, Brasil"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.footerBottom}>
        <div className="container">
          <div className={styles.bottomInner}>
            <span className="text-label" style={{ fontSize: '0.65rem', color: '#666' }}>© {currentYear} Isabela Paulino Studio. Todos os direitos reservados.</span>
            <div className={styles.bottomLinks}>
              <a href="#" className="text-label" style={{ fontSize: '0.65rem', color: '#666' }}>Política de privacidade</a>
              <span className="text-label" style={{ fontSize: '0.65rem', color: '#666' }}>/</span>
              <a href="#" className="text-label" style={{ fontSize: '0.65rem', color: '#666' }}>Declaração de cookies</a>
            </div>
            <span className="text-label" style={{ fontSize: '0.65rem', color: '#666' }}>Site feito com amor por Isabela Paulino ♥</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
