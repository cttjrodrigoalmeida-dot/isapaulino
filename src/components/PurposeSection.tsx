import { motion } from 'framer-motion'
import styles from './PurposeSection.module.css'

export default function PurposeSection() {
  return (
    <section className={styles.purpose}>
      <div className="container">
        <motion.h2 
          className={styles.purposeText}
          initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
          whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          viewport={{ once: true, margin: "-150px" }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          MAIS DO QUE ENTREGAR UM MATERIAL TÉCNICO BEM ORGANIZADO, MEU OBJETIVO É FAZER COM QUE VOCÊ SE SINTA SEGURO DURANTE TODO O PROCESSO.
        </motion.h2>
      </div>
    </section>
  )
}
