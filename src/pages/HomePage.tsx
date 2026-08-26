import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Welcome from '../components/Welcome'
import Services from '../components/Services'
import Portfolio from '../components/Portfolio'
import PurposeSection from '../components/PurposeSection'
import HowItWorks from '../components/HowItWorks'
import Testimonials from '../components/Testimonials'
import InstagramCTA from '../components/InstagramCTA'
import FAQ from '../components/FAQ'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import WhatsappFloat from '../components/WhatsappFloat'
import CustomCursor from '../components/CustomCursor'
import About from '../components/About'
import FadeIn from '../components/FadeIn'
import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import styles from './HomePage.module.css'

// Preloader de marca: logo + barra de carregamento; some sozinho e revela o site.
function SitePreloader({ onDone }: { onDone: () => void }) {
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setClosing(true), reduce ? 550 : 1900)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!closing) return
    const t = window.setTimeout(onDone, 450)
    return () => window.clearTimeout(t)
  }, [closing, onDone])
  return (
    <div className={`${styles.preloader} ${closing ? styles.closing : ''}`}>
      <div className={styles.preloaderLogoWrap}>
        <img src="/assets/logo-parasite.webp" alt="Isabela Paulino" className={styles.preloaderLogo} />
      </div>
      <div className={styles.preloaderBar}><div className={styles.preloaderFill} /></div>
    </div>
  )
}

export default function HomePage() {
  // Abertura do site (uma vez por sessão do navegador).
  const [booting, setBooting] = useState(() => {
    try { return sessionStorage.getItem('ips_site_intro_seen') !== '1' } catch { return true }
  })
  useEffect(() => {
    if (booting) { try { sessionStorage.setItem('ips_site_intro_seen', '1') } catch { /* ignore */ } }
  }, [])
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  return (
    <>
      {booting && <SitePreloader onDone={() => setBooting(false)} />}
      <CustomCursor />
      <Navbar />
      <main>
        <FadeIn delay={0.1}><Hero /></FadeIn>
        <Welcome />
        <Services />
        <FadeIn delay={0.1}><HowItWorks /></FadeIn>
        <FadeIn delay={0.1}><Portfolio /></FadeIn>
        <PurposeSection />
        <FadeIn delay={0.1}><Testimonials /></FadeIn>
        <FadeIn delay={0.1}><InstagramCTA /></FadeIn>
        <FadeIn delay={0.1}><About /></FadeIn>
        <FadeIn delay={0.1}><FAQ /></FadeIn>
        <FadeIn delay={0.1}><Contact /></FadeIn>
      </main>
      <FadeIn delay={0.1}><Footer /></FadeIn>
      <WhatsappFloat />
    </>
  )
}
