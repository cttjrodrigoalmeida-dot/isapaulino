import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import styles from './Welcome.module.css'

const ideaPhrases = [
  "A IDEIA AQUI É SIMPLES",
  "EVITAR QUE VOCÊ PRECISE",
  "RESOLVER NA OBRA",
  "O QUE PODERIA TER SIDO DECIDIDO",
  "AINDA NA FASE DE PROJETO."
]

function Phrase({ text, progress, range }: { text: string, progress: MotionValue<number>, range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.15, 1])
  return (
    <motion.span style={{ opacity }} className={styles.phrase}>
      {text}
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
            <span className={styles.headingAccent}>
              PROJETOS<br />
              EXECUTÁVEIS.
            </span>
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
              {ideaPhrases.map((phrase, i) => {
                // Animação termina aos 75% (0.75) do scroll para dar a pausa no final
                const animationDuration = 0.75
                const start = (i / ideaPhrases.length) * animationDuration
                const end = start + (animationDuration / ideaPhrases.length)
                return (
                  <Phrase
                    key={i}
                    text={phrase}
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
