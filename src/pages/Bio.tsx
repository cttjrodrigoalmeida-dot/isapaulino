import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Bio.module.css'
import CustomCursor from '../components/CustomCursor'
import { faqs } from '../components/FAQ'
import AnalogClock from '../components/AnalogClock'

const technicalSheet = [
  { label: 'Nome', value: 'Isabela Paulino' },
  { label: 'CAU', value: 'A313396-6' },
  { label: 'Formação', value: 'ARQUITETURA E URBANISMO - UNIGOIÁS | 2020/1' },
  { label: 'Especialização', value: 'Projeto Executivo de Arquitetura e Interiores' },
  { label: 'Experiência', value: '+6 ANOS EM DETALHAMENTO E 3D' },
  { label: 'Softwares', value: 'AutoCAD • Archicad • SketchUp Layout • Revit • CoronaRenderer • 3Ds Max • Photoshop • Illustrator' },
  { label: 'Método de Trabalho', value: 'Online • Terceirização • Parceria Estratégica' },
  { label: 'Entrega', value: 'FORMATO EM PDF • DWG • PLN • RVT • SKP • LAYOUT' },
]

export default function Bio() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    // Force top scroll on mount
    window.scrollTo(0, 0)
    document.title = 'Isabela Paulino - Links'
  }, [])

  return (
    <>
      <CustomCursor />
      <div className={styles.bioContainer}>
        {/* Background grid */}
        <div className={styles.bgGrid} aria-hidden="true" />

        <main className={styles.content}>

          {/* Identificação Imediata & Apresentação Profissional */}
          <div className={styles.profileSection}>
            <div className={styles.photoContainer}>
              <div className={styles.cornerAccent} aria-hidden="true" />
              <img
                src="/assets/images/hero-photo.webp"
                alt="Isabela Paulino"
                className={styles.photo}
              />

              {/* Texto circular girando do lado da foto */}
              <div className={styles.spinningBadge}>
                <svg viewBox="0 0 120 120" width="100%" height="100%">
                  <path
                    id="circlePath"
                    d="M 60, 60 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
                    fill="none"
                  />
                  <text>
                    <textPath href="#circlePath" startOffset="0%" textLength="282" className={styles.circularText}>
                      ISABELA PAULINO • ISABELA PAULINO •
                    </textPath>
                  </text>
                </svg>
              </div>
            </div>

            <h1 className={styles.name}>Isabela Paulino</h1>
            <p className={styles.role}>DESENVOLVIMENTO TÉCNICO / PROJETOS EXECUTIVOS / DETALHAMENTO PARA ARQUITETOS</p>
            <p className={styles.description}>
              Terceirize o detalhamento técnico com quem entende que projetos bem resolvidos começam no detalhe.
            </p>

            <div className={styles.highlights}>
              <span className={styles.highlightBadge}>✦ +200 PROJETOS REALIZADOS</span>
              <span className={styles.highlightBadge}>■ ATENDIMENTO 100% ONLINE</span>
            </div>
          </div>

          {/* Contatos & Redes Sociais */}
          <div className={styles.section}>

            <div className={styles.servicesList}>
              <h2 className={styles.sectionTitle}>Serviços</h2>
              <ul className={styles.serviceItems}>
                <li>Projeto Executivo de Arquitetura e Interiores</li>
                <li>Compatibilização de Projetos</li>
                <li>Detalhamento Técnico Minucioso</li>
                <li>Marcenaria e Marmoraria</li>
                <li>Terceirização para Arquitetos e Construtoras</li>
              </ul>
            </div>

            <a href="https://wa.me/556291942598" target="_blank" rel="noopener noreferrer" className={`btn btn-outline ${styles.linkBtn} ${styles.linkBtnHighlight} ${styles.br1}`}>
              SOLICITAR ORÇAMENTO
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            <a href="https://instagram.com/isabelapaulino.arq" target="_blank" rel="noopener noreferrer" className={`btn btn-outline ${styles.linkBtn} ${styles.br2}`}>
              INSTAGRAM
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            <button onClick={() => setIsAboutOpen(true)} className={`btn btn-outline ${styles.linkBtn} ${styles.br1}`}>
              SOBRE O ESTÚDIO
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <Link to="/" className={`btn btn-outline ${styles.linkBtn} ${styles.br2}`}>
              ACESSAR SITE COMPLETO
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            <button onClick={() => setIsFaqOpen(true)} className={`btn btn-outline ${styles.linkBtn} ${styles.br1}`}>
              PERGUNTAS FREQUENTES
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className={styles.footerInfo}>
            <div className={styles.clockWidget}>
              <AnalogClock />
              <span>SEG-SEX • 9H ÀS 18H</span>
            </div>

            <div className={styles.socialIconsRow}>
              <a href="https://www.tiktok.com/@isapaulinostudio" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" />
                </svg>
              </a>
              <a href="https://www.threads.com/@isapaulinostudio" target="_blank" rel="noopener noreferrer" aria-label="Threads">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.632 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 012.107.068c-.1-.671-.33-1.17-.69-1.485-.395-.343-.99-.516-1.773-.515h-.031c-.609.005-1.569.168-2.196 1.069l-1.675-1.146c.853-1.247 2.176-1.916 3.848-1.935h.048c3.27.035 5.098 2.004 5.098 5.412v.117c.358.197.698.428 1.01.69 1.126.942 1.872 2.276 2.168 3.856.387 2.042-.019 4.547-2.168 6.648C17.028 23.266 14.893 24 12.186 24z" />
                </svg>
              </a>
              <a href="https://www.pinterest.com/isapaulinostudio" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>
              <a href="mailto:isapaulinastudio@gmail.com" target="_blank" rel="noopener noreferrer" aria-label="E-mail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </a>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Sobre Mim */}
      {isAboutOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAboutOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsAboutOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.modalInner}>
              <div className={styles.modalPhotoContainer}>
                <img src="/assets/images/hero-photo.webp" alt="Isabela Paulino" className={styles.modalPhoto} />
                <div className={styles.modalCornerAccent} aria-hidden="true" />
              </div>

              <div className={styles.modalBio}>
                <h3 className={styles.modalTitle}>Isabela Paulino</h3>
                <p><strong>UM ESTÚDIO FOCADO EM TORNAR PROJETOS EXECUTÁVEIS.</strong></p>
                <p>Sou <strong>Isabela Paulino</strong>, arquiteta nascida em 1995, em Goiânia, Goiás, formada em Arquitetura e Urbanismo pela UniGoiás em 2020 e fundadora da Isabela Paulino Studio.</p>
                <p>Sempre enxerguei a arquitetura além da estética. Foi atuando com detalhamento executivo e visualização 3D que encontrei o caminho que queria seguir.</p>
                <p>Hoje, junto à minha equipe, desenvolvo projetos para arquitetos e construtoras no Brasil e no exterior, com foco em detalhamento executivo, organização e atenção à execução na prática.</p>
              </div>

              <div className={styles.modalTechSheet}>
                <h4 className={styles.modalTechSheetTitle}>Ficha Técnica</h4>
                <div className={styles.modalTechSheetBody}>
                  {technicalSheet.map((item, idx) => (
                    <div key={idx} className={styles.modalTechRow}>
                      <span className={styles.modalTechLabel}>{item.label}</span>
                      <span className={styles.modalTechValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Perguntas Frequentes */}
      {isFaqOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsFaqOpen(false)}>
          <div className={`${styles.modalContent} ${styles.faqModalContent}`} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsFaqOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.modalInner}>
              <div className={styles.modalBio}>
                <h3 className={styles.modalTitle}>Perguntas Frequentes</h3>
              </div>

              <div className={styles.faqList}>
                {faqs.map((faq, idx) => (
                  <div key={idx} className={`${styles.faqItem} ${faqOpenIdx === idx ? styles.faqItemOpen : ''}`}>
                    <button
                      className={styles.faqQuestion}
                      onClick={() => setFaqOpenIdx(faqOpenIdx === idx ? null : idx)}
                    >
                      <span className={styles.faqQuestionText}>{faq.q}</span>
                      <span className={styles.faqToggle}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    <div className={styles.faqAnswer}>
                      <p>{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
