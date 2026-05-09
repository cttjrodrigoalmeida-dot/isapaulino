import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'

const navItems = [
  { label: 'Início', href: '#inicio' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Projetos', href: '#projetos' },
  { label: 'Feedbacks', href: '#feedbacks' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
]

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/isapaulinostudio/', icon: 'IG' },
  { label: 'TikTok', href: 'https://tiktok.com/@isapaulinostudio', icon: 'TK' },
  { label: 'Threads', href: '#', icon: 'TH' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/isapaulinostudio', icon: 'PT' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      setActiveSection(href.replace('#', ''))
      setMobileMenuOpen(false) // Close menu on click
    }
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className={`${styles.navbarWrapper} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
        {/* Logo */}
        <a href="#inicio" className={styles.logo} onClick={(e) => handleNavClick(e, '#inicio')}>
          <img src="/assets/logo-parasite.png" alt="Isabela Paulino Studio" className={styles.logoImg} />
        </a>

{/* Mobile Toggle Button */}
<button
  className={styles.mobileMenuBtn}
  onClick={toggleMobileMenu}
  aria-label="Toggle menu"
>
  <div className={`${styles.hamburger} ${mobileMenuOpen ? styles.open : ''}`}>
    <span></span>
    <span></span>
    <span></span>
  </div>
</button>

        {/* Desktop & Mobile Menu container */}
        <div className={`${styles.navContent} ${mobileMenuOpen ? styles.open : ''}`}>
          {/* Nav items */}
          <ul className={styles.navList}>
            {navItems.map((item, index) => (
              <li key={item.href} className={styles.navItem}>
                <a
                  href={item.href}
                  className={`${styles.navLink} ${activeSection === item.href.replace('#', '') ? styles.active : ''}`}
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  {item.label}
                </a>
                {index < navItems.length - 1 && <span className={styles.navSeparator}>·</span>}
              </li>
            ))}
          </ul>

          {/* Social Links */}
          <div className={styles.socialLinks}>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className={styles.socialLink}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SocialIcon name={social.label} />
              </a>
            ))}
          </div>
        </div>
        </div>
      </nav>
    </header>
  )
}

function SocialIcon({ name }: { name: string }) {
  switch (name) {
    case 'Instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'TikTok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" />
        </svg>
      )
    case 'Threads':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.632 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 012.107.068c-.1-.671-.33-1.17-.69-1.485-.395-.343-.99-.516-1.773-.515h-.031c-.609.005-1.569.168-2.196 1.069l-1.675-1.146c.853-1.247 2.176-1.916 3.848-1.935h.048c3.27.035 5.098 2.004 5.098 5.412v.117c.358.197.698.428 1.01.69 1.126.942 1.872 2.276 2.168 3.856.387 2.042-.019 4.547-2.168 6.648C17.028 23.266 14.893 24 12.186 24z" />
        </svg>
      )
    case 'Pinterest':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      )
    default:
      return null
  }
}
