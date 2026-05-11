import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import styles from './PurposeSection.module.css'

const purposePhrases = [
  "MAIS DO QUE ENTREGAR UM",
  "MATERIAL TÉCNICO BEM ORGANIZADO,",
  "MEU OBJETIVO É FAZER COM QUE",
  "VOCÊ SE SINTA SEGURO",
  "DURANTE TODO O PROCESSO."
]

function Phrase({ text, progress, range }: { text: string, progress: MotionValue<number>, range: [number, number] }) {
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
