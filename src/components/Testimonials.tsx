import { useRef } from 'react'
import styles from './Testimonials.module.css'

const testimonials = [
  {
    id: 7,
    name: 'Leison Martins',
    handle: '@leisonmartins',
    location: 'Goiás, Brasil.',
    role: 'Engenheiro Civil',
    text: 'Trabalhar com a Isabela é sempre um prazer; Ela leva suas ideias para o próximo nível com excelente gerenciamento de projetos e flexibilidade para soluções ao longo do caminho.',
  },
  {
    id: 6,
    name: 'Jordana Paulino',
    handle: '@jordanaluciia',
    location: 'Goiás, Brasil.',
    role: 'Engenheira Agrônoma',
    text: 'Parabéns Isabela! Profissional extremamente comprometida, atenta aos detalhes e dedicada a entregar sempre com excelência. Recomendo com total confiança! Orgulho de você ❤️',
  },
  {
    id: 8,
    name: 'Pedro Malta',
    handle: '@estudio.cantu',
    location: 'São Paulo, Brasil.',
    role: 'Arquiteto / Estúdio Cantú',
    text: 'Oi Isabela Bom dia. Primeiramente mto obrigado! Já enviamos os desenhos e vc nos salvou. Isabela to mto satisfeito com o trabalho, os pontos que apontei sao bem poucos.',
  },
  {
    id: 1,
    name: 'Ana Araújo',
    handle: '@anaaraujoarquitetura',
    location: 'Minas Gerais, Brasil.',
    role: 'Arquiteta',
    text: 'É isso mesmo! Nossa, você foi super rápida! Você me salvou!',
  },
  {
    id: 2,
    name: 'Carol Bedin',
    handle: '@bedinconstrutora',
    location: 'Mato Grosso, Brasil.',
    role: 'Arquiteta / Bedin Construtora',
    text: 'Isa, ficou show! Seu trabalho é espetacular.',
  },
  {
    id: 3,
    name: 'Égina Queiroz',
    handle: '@eginaqueiroz.arquitetura',
    location: 'Goiás, Brasil.',
    role: 'Arquiteta',
    text: 'Ficou ótimo querida! Muito obrigada pela sua diligência 🙏 Já me coloca no seu cronograma para mais detalhamentos. Quando surgir disponibilidade me avisa para eu te enviar mais projetos ✌️',
  },
  {
    id: 4,
    name: 'Grace Santiago',
    handle: '@gracesantiago.arquiteta',
    location: 'Goiás, Brasil.',
    role: 'Arquiteta',
    text: 'Ficou perfeito, amei. 🥰 Bem como eu queria. Da última reunião pra cá foi uma evolução fodastica. Ficou topissimo, você foi super assertiva absorveu todas as referências. Todos os detalhes que pedi. Ficou um capricho!',
  },
  {
    id: 5,
    name: 'Isabella Serrano',
    handle: '@arquitetaisabellaserrano',
    location: 'Espírito Santo, Brasil.',
    role: 'Arquiteta',
    text: 'Isaa ficou perfeito!',
  },
]

export default function Testimonials() {
  const carouselRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <section id="feedbacks" className={`${styles.testimonials} section-padding`}>
      <div className="container">
        {/* Header */}
        <div className={styles.sectionHeaderWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerLabel}>
              <span className={styles.dot}></span>
              <span>Feedbacks</span>
            </div>
            <h2 className={styles.title}>
              O QUE DIZEM SOBRE NÓS<br />
              <span className={styles.titleMuted}>A NOSSA EXPERIÊNCIA</span>
            </h2>
          </div>
          <div className={styles.carouselControls}>
            <button onClick={() => scroll('left')} className={styles.controlBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => scroll('right')} className={styles.controlBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        <div className={styles.grid} ref={carouselRef}>
          {testimonials.map((t, idx) => (
            <div key={t.id} className={styles.card}>
              <p className={styles.quoteText}>{t.text}</p>

              <div className={styles.cardFooter}>
                <div className={styles.clientInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={styles.clientName}>{t.name}</span>
                    {t.handle && <span className={styles.clientSeparator}>|</span>}
                    {t.handle && <span className={styles.clientHandle}>{t.handle}</span>}
                  </div>
                  <span className={styles.clientRole}>{t.role}</span>
                  {t.location && <span className={styles.clientLocation}>{t.location}</span>}
                </div>
                <div className={styles.cardNumber}>
                  {idx + 1}/{testimonials.length}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
