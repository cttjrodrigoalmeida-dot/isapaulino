import styles from './Services.module.css'

const services = [
  {
    id: '01',
    title: 'PROJETO EXECUTIVO DE INTERIORES',
    description: 'Desenvolvimento técnico completo para transformar o conceito do projeto em uma execução clara, organizada e bem resolvida, reduzindo imprevistos na obra e facilitando a comunicação entre todos os envolvidos.',
    buttonText: 'Quero detalhar meu projeto',
    image: '/assets/services/1.jpg',
  },
  {
    id: '02',
    title: 'COMPATIBILIZAÇÃO DE PROJETOS',
    description: 'Análise e alinhamento entre arquitetura, interiores e projetos complementares para identificar interferências antes da obra, evitando retrabalhos, conflitos na execução e decisões feitas às pressas no canteiro.',
    buttonText: 'Quero este serviço',
    image: '/assets/services/CARD2.jpg',
  },
  {
    id: '03',
    title: 'DETALHAMENTO DE MARCENARIA E MARMORARIA',
    description: 'Desenhos técnicos detalhados para fabricação de marcenaria e marmoraria sob medida, garantindo alinhamento estético, funcionalidade, precisão nas medidas e mais segurança durante a execução.',
    buttonText: 'Quero este serviço',
    image: '/assets/services/CARD3.jpg',
  },
  {
    id: '04',
    title: 'DETALHAMENTO DE ÁREAS MOLHADAS',
    description: 'Desenvolvimento técnico de cozinhas, banheiros e áreas de serviço, com definição de pontos hidráulicos, revestimentos, bancadas e acabamentos para uma execução mais organizada e eficiente.',
    buttonText: 'Quero este serviço',
    image: '/assets/services/CARD4.jpg',
  },
  {
    id: '05',
    title: 'PLANTAS TÉCNICAS PARA EXECUÇÃO',
    description: 'Pranchas técnicas completas e organizadas para orientar fornecedores, equipe de obra e execução do projeto, facilitando a leitura, reduzindo dúvidas e trazendo mais clareza para cada etapa da obra.',
    buttonText: 'Quero este serviço',
    image: '/assets/services/CARD5.jpg',
  }
]

export default function Services() {
  return (
    <section id="servicos" className={styles.servicesSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.mainTitle}>
            SERVIÇOS <span className={styles.accentText}>QUE ELEVAM O<br />NÍVEL DO SEU PROJETO</span>
          </h2>
          <div className={styles.titleSpacer} />
        </div>

        <div className={styles.cardsContainer}>
          {services.map((service) => (
            <div key={service.id} className={styles.serviceCard}>
              <div className={styles.cardContent}>
                <div className={styles.cardLine} />
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardDesc}>{service.description}</p>
                <a href="#contato" className={styles.cardBtn}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {service.buttonText}
                </a>
              </div>
              <div className={styles.cardImageWrapper}>
                <img src={service.image} alt={service.title} className={styles.cardImage} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
