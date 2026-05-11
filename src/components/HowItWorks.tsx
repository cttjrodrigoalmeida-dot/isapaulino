import FadeIn from './FadeIn'
import styles from './HowItWorks.module.css'

const steps = [
  {
    num: '1.',
    title: 'PRIMEIRO CONTATO',
    desc: 'Você me apresenta o projeto e me conta o que precisa detalhar, como marcenaria, marmoraria, iluminação, hidráulica e outros pontos importantes. Aqui alinhamos as expectativas iniciais.',
  },
  {
    num: '2.',
    title: 'PROPOSTA PERSONALIZADA',
    desc: 'Analiso o material e te envio uma proposta com escopo, prazo, investimento e como o projeto será desenvolvido na prática. Cada projeto é avaliado de forma individual, de acordo com a complexidade.',
  },
  {
    num: '3.',
    title: 'INÍCIO DO PROJETO',
    desc: 'Com a proposta aprovada, seguimos com a assinatura do contrato, pagamento da entrada e envio completo dos materiais necessários. Após isso, envio o briefing para preenchimento com as definições do projeto. Com tudo certo, o projeto é iniciado e o prazo começa a contar.',
  },
  {
    num: '4.',
    title: 'DESENVOLVIMENTO',
    desc: 'Aqui eu organizo tudo: referências, arquivos, medidas, informações técnicas e pranchas. Cada detalhe é pensado para facilitar a leitura de quem vai executar e reduzir dúvidas durante a obra.',
  },
  {
    num: '5.',
    title: 'REVISÃO',
    desc: 'Com o material em mãos, você revisa com calma e me envia os ajustes necessários. A ideia é lapidar o projeto antes da entrega final, sem correria e sem bagunça.',
  },
  {
    num: '6.',
    title: 'ENTREGA FINAL',
    desc: 'Após a revisão, você recebe o projeto completo em PDF e no formato editável, conforme o software utilizado. E, se surgir alguma dúvida pontual depois da entrega, você ainda conta com suporte por até 5 dias úteis.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className={styles.howSection}>
      <div className="container">
        {/* Header */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>
            COMO FUNCIONA<br />
            <span className={styles.titleOutline}>O DETALHAMENTO</span>
          </h2>
          <p className={styles.subtitle}>
            Um processo simples, com etapas claras e prazos definidos<br/>
            para que seu projeto chegue pronto para execução.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {steps.map((step, idx) => (
            <FadeIn key={idx} delay={idx * 0.15} style={{ height: '100%' }}>
              <div className={`${styles.stepCard} ${styles['card' + (idx + 1)]}`} style={{ height: '100%' }}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNum}>{step.num}</span> {step.title}
                </h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
