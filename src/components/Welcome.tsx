import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import styles from './Welcome.module.css'

const ideaText = "A IDEIA AQUI É SIMPLES: EVITAR QUE VOCÊ PRECISE RESOLVER NA OBRA O QUE PODERIA TER SIDO DECIDIDO NO PROJETO."
const words = ideaText.split(" ")

function Word({ word, progress, range }: { word: string, progress: MotionValue<number>, range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.10, 1])
  return (
    <motion.span style={{ opacity }} className={styles.word}>
      {word}
    </motion.span>
  )
}

export default function Welcome() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ["start center", "end center"]
  })

  return (
    <section className={styles.welcomeSection}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.left}>
          <h2 className={styles.heading}>
            UM ESTÚDIO<br />
            FOCADO EM<br />
            TORNAR<br />
            PROJETOS<br />
            EXECUTÁVEIS.
          </h2>
        </div>
        <div className={styles.right}>
          <p className={styles.boldText}>Bem-vindo ao Isabela Paulino Studio.</p>
          <p>
            Eu sou a Isabela, arquiteta e fundadora do estúdio. Atuo
            com detalhamento executivo terceirizado, para arquitetos, designers e construtoras que
            precisam transformar ideias em projetos claros,
            organizados e prontos para execução.
          </p>
          <p>
            Já participei de mais de 200 projetos no Brasil e no exterior,
            e sei bem como o detalhamento costuma ficar para o final,
            justamente quando o prazo está apertado, o cliente está
            cobrando e a obra precisa de respostas.
          </p>
          <p>É aí que eu entro.</p>
          <p>
            Organizo as informações, desenvolvo o material técnico e
            preparo o projeto para que quem executa consiga
            entender, seguir e construir com mais segurança.
          </p>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Scroll Animated Text Section */}
      <div ref={scrollContainerRef} className={styles.scrollTextContainer}>
        <div className={styles.stickyTextContainer}>
          <div className="container">
            <h3 className={styles.ideaHeading}>
              {words.map((word, i) => {
                const start = i / words.length
                const end = start + (1 / words.length)
                return (
                  <Word
                    key={i}
                    word={word}
                    progress={scrollYProgress}
                    range={[start, end]}
                  />
                )
              })}
            </h3>
          </div>
        </div>
      </div>

      <div className={styles.dividerBottom} />
    </section>
  )
}
