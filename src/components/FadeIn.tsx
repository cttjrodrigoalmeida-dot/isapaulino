import { motion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'

export default function FadeIn({ 
  children, 
  delay = 0,
  className = '',
  style
}: { 
  children: ReactNode, 
  delay?: number,
  className?: string,
  style?: CSSProperties
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  )
}
