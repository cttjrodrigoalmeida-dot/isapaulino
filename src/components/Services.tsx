import styles from './Services.module.css'

const services = [
  {
    id: '01',
    title: 'DETALHAMENTO DE INTERIORES',
    description: 'Se você já teve obra parando por falta de detalhe ou fornecedor pedindo medida, sabe o quanto isso desgasta. Eu organizo o projeto em pranchas claras e completas, para uma execução com menos dúvidas e menos margem para erro.',
    tags: ['AutoCad', 'Archicad', 'Layout', 'Revit'],
    buttonText: 'Quero detalhar meu projeto',
    image: '/assets/services/1.jpg',
  },
  {
    id: '02',
    title: 'MODELAGEM E IMAGEM 3D',
    description: 'Apresente seu projeto com imagens que realmente vendem. Renders realistas que valorizam cada escolha de material, iluminação e design, ajudando seu cliente a entender e aprovar o projeto mais rápido.',
    tags: ['3ds Max', 'Corona', 'SketchUp', 'Lumion'],
    buttonText: 'Quero orçar minhas imagens',
    image: '/assets/services/13D.jpg',
  },
  {
    id: '03',
    title: 'ANIMAÇÃO ARQUITETÔNICA',
    description: 'Vá além da imagem estática. Vídeos e animações que mostram a fluidez do espaço, a transição da luz e a atmosfera do projeto, criando uma experiência imersiva e de alto impacto para apresentações e redes sociais.',
    tags: ['Motion 3D', 'Cinema 4D', 'After Effects', '4K'],
    buttonText: 'Quero um vídeo do meu projeto',
    image: '/assets/services/23D.jpg',
  }
]

export default function Services() {
  return (
    <section id="servicos" className={styles.servicesSection}>
      <div className="container">
        <h2 className={styles.mainTitle}>
          SERVIÇOS <span className={styles.accentText}>QUE ELEVAM O<br />NÍVEL DO SEU PROJETO</span>
        </h2>

        <div className={styles.cardsContainer}>
          {services.map((service) => (
            <div key={service.id} className={styles.serviceCard}>
              <div className={styles.cardContent}>
                <div className={styles.cardLine} />
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardDesc}>{service.description}</p>
                <div className={styles.tagRow}>
                  {service.tags.map((tag, index) => (
                    <span key={tag}>
                      <span className={styles.tag}>{tag}</span>
                      {index < service.tags.length - 1 && <span className={styles.tagSeparator}>·</span>}
                    </span>
                  ))}
                </div>
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
