import styles from './About.module.css'

const technicalSheet = [
  { label: 'Nome', value: 'Isabela Paulino' },
  { label: 'CAU', value: 'A313396-6' },
  { label: 'Formação', value: 'ARQUITETURA E URBANISMO - UNIGOIÁS | 2020/21' },
  { label: 'Especialização', value: 'Projeto Executivo de Arquitetura e Interiores' },
  { label: 'Experiência', value: '+6 ANOS EM DETALHAMENTO E 3D' },
  { label: 'Softwares', value: 'AutoCAD • Archicad • SketchUp Layout • Revit • CoronaRenderer • 3Ds Max • Photoshop • Illustrator' },
  { label: 'Método de Trabalho', value: 'Online • Terceirização • Parceria Estratégica' },
  { label: 'Entrega', value: 'FORMATO EM PDF • DWG • PLN • RVT • SKP • LAYOUT' },
]

export default function About() {
  return (
    <section id="sobre" className={`${styles.about} section-padding`}>
      <div className="container">
        {/* Header */}
        <div className={styles.sectionHeader}>
          <span className="text-subtitle">Quem está por trás do estúdio</span>
          <h2 className="text-section-title">Sobre</h2>
        </div>

        <div className="divider" style={{ margin: '48px 0' }} />

        <div className={styles.content}>
          {/* Left: photo + competences */}
          <div className={styles.left}>
            <div className={styles.photoContainer}>
              <img
                src="/assets/images/hero-photo.jpg"
                alt="Isabela Paulino"
                className={styles.aboutPhoto}
              />
              <div className={styles.cornerAccent} aria-hidden="true" />
            </div>
          </div>

          {/* Right: bio + technical sheet */}
          <div className={styles.right}>
            <div className={styles.bioBlock}>
              <p className={styles.bioText}>
                Sou <strong>Isabela Paulino</strong>, arquiteta nascida em 1995, em Goiânia, Goiás, formada em Arquitetura e Urbanismo pela UniGoiás em 2020 e fundadora da Isabela Paulino Studio.
              </p>
              <p className={styles.bioText}>
                Sempre enxerguei a arquitetura além da estética. Foi atuando com detalhamento executivo e visualização 3D que encontrei o caminho que queria seguir.
              </p>
              <p className={styles.bioText}>
                Hoje, junto à minha equipe, desenvolvo projetos para arquitetos e construtoras no Brasil e no exterior, com foco em detalhamento executivo, organização e atenção à execução na prática.
              </p>
            </div>

            {/* Technical sheet — "Ficha Técnica" */}
            <div className={styles.techSheet}>
              <div className={styles.techSheetHeader}>
                <span className={styles.techSheetTitle}>Ficha Técnica</span>
              </div>
              <div className={styles.techSheetBody}>
                {technicalSheet.map((item, idx) => (
                  <div key={idx} className={styles.techRow}>
                    <span className={styles.techLabel}>{item.label}</span>
                    <span className={styles.techValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className={styles.aboutCta}>
              <a href="https://instagram.com/isapaulinostudio" className="btn btn-outline" target="_blank" rel="noopener noreferrer">
                Instagram
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
                  <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="https://wa.me/556291942598" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                Terceirize Conosco
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
