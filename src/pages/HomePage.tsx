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
import { useEffect } from 'react'
import Lenis from 'lenis'

export default function HomePage() {
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
