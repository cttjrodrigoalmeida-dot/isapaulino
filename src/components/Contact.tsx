import { useState } from 'react'
import styles from './Contact.module.css'
import AnalogClock from './AnalogClock'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [accepted, setAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) {
      alert('Por favor, aceite a Declaração de Privacidade.')
      return
    }
    const msg = encodeURIComponent(
      `Olá Isabela! Meu nome é ${formData.name}.\n` +
      `E-mail: ${formData.email}\n` +
      `Telefone: ${formData.phone}\n\n` +
      `${formData.message}`
    )
    window.open(`https://wa.me/556291942598?text=${msg}`, '_blank')
    setSubmitted(true)
  }

  return (
    <section id="contato" className={styles.contactSection}>
      <div className={styles.containerSplit}>

        {/* Left Column: Contate-nos */}
        <div className={styles.leftColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.line}></div>
            <h2>CONTATE-NOS</h2>
          </div>

          <div className={styles.profileCard}>
            <div className={styles.profileImageWrapper}>
              {/* Foto da HERO conforme solicitado */}
              <img src="/assets/images/hero-photo.jpg" alt="Isabela Paulino" className={styles.profileImage} />
            </div>
            <div className={styles.profileInfo}>
              <img src="/assets/logo-parasite.png" alt="Isabela Paulino Studio" className={styles.profileLogo} />
              <p className={styles.profileRole}>
                Fundadora -<br />
                Arquiteta<br />
                CAU: A313396-6
              </p>
            </div>
          </div>

          <div className={styles.contactDetailsRow}>
            <div className={styles.contactDetailsText}>
              <p><span>+</span> <a href="mailto:isapaulinostudio@gmail.com">isapaulinostudio@gmail.com</a></p>
              <div className={styles.separator}></div>
              <p><span>+</span> Goiás, Brasil</p>
              <p><span>+</span> (BRT - Brasília Time em UTC -03:00)</p>
            </div>
            <div className={styles.clockWrapper}>
              <AnalogClock />
              <p className={styles.businessHours}>
                Seg–Sex · 9h às 18h
              </p>
            </div>
          </div>

          <div className={styles.socialIcons}>
            <a href="https://www.instagram.com/isapaulinostudio/" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>IG</a>
            <a href="https://tiktok.com/@isapaulinostudio" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>TK</a>
            <a href="https://www.threads.com/@isapaulinostudio" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>TH</a>
            <a href="https://www.pinterest.com/isapaulinostudio" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>PT</a>
          </div>
        </div>

        {/* Right Column: Faça uma Pergunta */}
        <div className={styles.rightColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.line}></div>
            <h2>FAÇA UMA PERGUNTA</h2>
          </div>

          {!submitted ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="+ Seu Nome e Sobrenome *"
                  required
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="+ Seu E-mail *"
                  required
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+ Seu número de contato *"
                  required
                />
              </div>
              <div className={styles.inputWrapper}>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="+ Mensagem... *"
                  required
                  rows={4}
                />
              </div>

              <div className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  id="privacy"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <label htmlFor="privacy">
                  Ao enviar este formulário, você confirma que leu e concorda com a Isabela Paulino Studio Declaração de Privacidade.
                </label>
              </div>

              <div className={styles.submitWrapper}>
                <button type="submit" className={styles.submitBtn}>
                  Enviar mensagem...
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.successMsg}>
              <h3>Mensagem enviada com sucesso!</h3>
              <button onClick={() => setSubmitted(false)} className={styles.submitBtn}>
                Enviar outra mensagem
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
