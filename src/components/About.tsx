import styles from './About.module.css'

const technicalSheet = [
  { label: 'Formação', value: 'Arquitetura e Urbanismo · CAU Registrado' },
  { label: 'Especialização', value: 'Design de Interiores · Visualização 3D' },
  { label: 'Experiência', value: '6+ anos em detalhamento técnico executivo' },
  { label: 'Softwares', value: 'AutoCAD · Revit · 3ds Max · Corona · SketchUp · Lumion' },
  { label: 'Método de trabalho', value: 'Remoto · Terceirização · Parceria estratégica' },
  { label: 'Entrega', value: 'PDF executivo · DWG · JPG alta resolução · Vídeo 4K' },
]

const competences = [
  'Detalhamento técnico executivo completo',
  'Modelagem 3D e renderização fotorrealista',
  'Animação arquitetônica cinematográfica',
  'Coordenação de projetos terceirizados',
  'Compatibilização de projetos',
  'Apresentação e prancha de conceito',
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
              {/* Corner decorators */}
              <div className={styles.cornerTL} aria-hidden="true" />
              <div className={styles.cornerBR} aria-hidden="true" />
            </div>

            {/* Competences */}
            <div className={styles.competencesList}>
              <span className="text-label" style={{ marginBottom: '16px', display: 'block' }}>Competências</span>
              {competences.map((comp, i) => (
                <div key={i} className={styles.competenceItem}>
                  <div className={styles.competenceLine} />
                  <span className={styles.competenceText}>{comp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: bio + technical sheet */}
          <div className={styles.right}>
            <div className={styles.bioBlock}>
              <p className={styles.bioText}>
                Isabela Angela Paulino Rodrigues é arquiteta com registro no CAU e especialista em detalhamento técnico executivo, visualização 3D e animação arquitetônica.
              </p>
              <p className={styles.bioText}>
                Fundadora do <strong>Isabela Paulino Studio</strong>, atua há mais de 6 anos prestando serviços de terceirização para escritórios de arquitetura e design de interiores em todo o Brasil — sempre com rigor técnico e excelência visual.
              </p>
              <p className={styles.bioText}>
                Cada projeto é tratado com atenção personalizada, garantindo entregas precisas, dentro do prazo e alinhadas às necessidades de cada cliente.
              </p>
            </div>

            {/* Technical sheet — "Ficha Técnica" */}
            <div className={styles.techSheet}>
              <div className={styles.techSheetHeader}>
                <span className="text-label">Ficha Técnica</span>
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
              <a href="#contato" className="btn btn-outline">
                Trabalhe conosco
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
