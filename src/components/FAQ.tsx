import { useState } from 'react'
import styles from './FAQ.module.css'

export const faqs = [
  {
    q: 'Para quem é indicado o seu serviço?',
    a: 'Meu trabalho é voltado principalmente para arquitetos, designers de interiores e construtoras que precisam de apoio técnico no desenvolvimento de detalhamento executivo, imagens 3D ou apresentações visuais.',
  },
  {
    q: 'O que preciso enviar para receber um orçamento do meu projeto?',
    a: 'Para que eu consiga entender o projeto com clareza, preciso receber o modelo 3D, referências e informações sobre quais serviços serão necessários, como marcenaria, marmoraria, iluminação, paginação ou outros detalhamentos.',
  },
  {
    q: 'Quais programas você utiliza e os arquivos são entregues editáveis?',
    a: 'Os projetos podem ser desenvolvidos em Archicad, AutoCAD, SketchUp Layout e Revit, sempre de acordo com a necessidade do seu projeto e do fluxo do seu escritório. Os arquivos são entregues em PDF e também no formato editável, conforme o software utilizado.',
  },
  {
    q: 'Você consegue seguir o padrão gráfico do meu escritório?',
    a: 'Sim. Caso o seu escritório já tenha template, CTB, organização de layers ou padrão gráfico definido, consigo desenvolver o projeto seguindo a identidade visual do seu escritório.',
  },
  {
    q: 'Como funciona o prazo, revisão e suporte do projeto?',
    a: 'O prazo varia conforme o tamanho e a complexidade do projeto. A contagem começa após o envio completo dos materiais, assinatura do contrato e pagamento da entrada. Após o envio do material, você pode analisar o projeto com calma e encaminhar os ajustes necessários dentro do prazo combinado. Após a entrega final, você ainda conta com suporte para dúvidas pontuais e pequenas correções por até 5 dias úteis.',
  },
  {
    q: 'Como saber se faz sentido terceirizar o detalhamento?',
    a: 'Se você sente que o detalhamento está consumindo muito tempo do escritório ou atrasando outras etapas do projeto, a terceirização pode ajudar a trazer mais organização e agilidade para sua rotina.',
  },
  {
    q: 'O projeto precisa estar totalmente definido antes do detalhamento?',
    a: 'O ideal é que o projeto esteja o mais alinhado possível antes do início do detalhamento. Isso evita retrabalho, alterações no cronograma e ajustes durante o processo.',
  },
  {
    q: 'Como funciona a comunicação e os prazos emergenciais?',
    a: 'A comunicação acontece principalmente via WhatsApp, de forma organizada e com alinhamentos durante todas as etapas do projeto. Também trabalho com prazos emergenciais, dependendo da demanda e da disponibilidade da agenda. Nesse caso, o prazo e o investimento são analisados de forma personalizada.',
  },
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section id="faq" className={`${styles.faq} section-padding`}>
      <div className="container">
        <div className={styles.inner}>
          {/* Left: header */}
          <div className={styles.faqLeft}>
            <span className="text-subtitle">Tire suas dúvidas</span>
            <h2 className="text-section-title">Perguntas<br />Frequentes</h2>
            <p className="text-body" style={{ maxWidth: 280 }}>
              Não encontrou o que procurava? Entre em contato pelo WhatsApp e respondemos em breve.
            </p>
            <a href="https://wa.me/556291942598" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ marginTop: '8px' }}>
              Fale Conosco
            </a>
          </div>

          {/* Right: accordion */}
          <div className={styles.faqRight}>
            {faqs.map((faq, idx) => (
              <div key={idx} className={`${styles.faqItem} ${openIdx === idx ? styles.open : ''}`}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  aria-expanded={openIdx === idx}
                >
                  <span className={styles.faqNum}>{String(idx + 1).padStart(2, '0')}</span>
                  <span className={styles.faqQuestionText}>{faq.q}</span>
                  <span className={`${styles.faqToggle} ${openIdx === idx ? styles.open : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                <div className={`${styles.faqAnswer} ${openIdx === idx ? styles.answerOpen : ''}`}>
                  <p className="text-body">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
