import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import styles from './PurposeSection.module.css'

const purposePhrases = [
  <span key={1}>MAIS DO QUE ENTREGAR <br className="br-mobile" /></span>,
  <span key={2}>UM <br className="br-desktop" />MATERIAL TÉCNICO <br className="br-mobile" /></span>,
  <span key={3}>BEM ORGANIZADO, <br className="br-desktop" /><br className="br-mobile" /></span>,
  <span key={4}>NOSSO OBJETIVO É <br className="br-mobile" /></span>,
  <span key={5}>FAZER COM QUE <br className="br-desktop" />VOCÊ <br className="br-mobile" /></span>,
  <span key={6}>SE SINTA SEGURO <br className="br-desktop" /><br className="br-mobile" /></span>,
  <span key={7}>DURANTE TODO <br className="br-mobile" /></span>,
  <span key={8}>PROCESSO.</span>
]

function Phrase({ text, progress, range }: { text: React.ReactNode, progress: MotionValue<number>, range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.15, 1])
  return (
    <motion.span style={{ opacity }} className={styles.phrase}>
      {text}
    </motion.span>
  )
}

export default function PurposeSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ["start center", "end center"]
  })

  return (
    <section className={styles.purpose}>
      <div ref={scrollContainerRef} className={styles.scrollTextContainer}>
        <div className={styles.stickyTextContainer}>
          <div className="container">
            <h2 className={styles.purposeText}>
              {purposePhrases.map((phrase, i) => {
                const animationDuration = 0.75
                const start = (i / purposePhrases.length) * animationDuration
                const end = start + (animationDuration / purposePhrases.length)
                return (
                  <Phrase
                    key={i}
                    text={phrase}
                    progress={scrollYProgress}
                    range={[start, end]}
                  />
                )
              })}
            </h2>
          </div>
        </div>
      </div>
    </section>
  )
}
