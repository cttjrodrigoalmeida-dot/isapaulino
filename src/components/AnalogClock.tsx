import { useEffect, useState } from 'react'
import styles from './AnalogClock.module.css'

export default function AnalogClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      // Create a date object specifically for UTC-3 (Brasília)
      const now = new Date()
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
      const brt = new Date(utc - (3 * 3600000))
      setTime(brt)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  // Calculate rotations
  const secondsDeg = (seconds / 60) * 360
  const minutesDeg = (minutes / 60) * 360 + (seconds / 60) * 6
  const hoursDeg = ((hours % 12) / 12) * 360 + (minutes / 60) * 30

  // Status logic: Open between 09:00 and 17:59, Mon-Fri
  const isWeekend = time.getDay() === 0 || time.getDay() === 6
  const isOpen = !isWeekend && hours >= 9 && hours < 18

  return (
    <div className={styles.clockContainer}>
      <div className={styles.clockFace}>
        {/* Marcadores de borda sutis baseados no design */}
        <div className={styles.cornerTopLeft}></div>
        <div className={styles.cornerTopRight}></div>
        <div className={styles.cornerBottomLeft}></div>
        <div className={styles.cornerBottomRight}></div>
        
        {/* Central dot */}
        <div className={styles.centerDot}></div>

        {/* Hands */}
        <div 
          className={`${styles.hand} ${styles.hourHand}`}
          style={{ transform: `rotate(${hoursDeg}deg)` }}
        />
        <div 
          className={`${styles.hand} ${styles.minuteHand}`}
          style={{ transform: `rotate(${minutesDeg}deg)` }}
        />
        <div 
          className={`${styles.hand} ${styles.secondHand}`}
          style={{ transform: `rotate(${secondsDeg}deg)` }}
        />
      </div>
      
      {/* Status Smile */}
      <div className={`${styles.statusSmile} ${isOpen ? styles.open : styles.closed}`}>
        {isOpen ? '🟢 😊' : '🔴 😴'}
      </div>
    </div>
  )
}
