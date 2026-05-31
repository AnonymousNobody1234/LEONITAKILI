import { ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface WordsPullUpProps {
  text: string
  className?: string
  /**
   * When true, renders a superscript asterisk after the last character "a"
   * of the final word (used for the "Prisma*" hero heading).
   */
  showAsterisk?: boolean
}

const wordVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

export default function WordsPullUp({
  text,
  className = '',
  showAsterisk = false,
}: WordsPullUpProps) {
  const words = text.split(' ')
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const lastWordIndex = words.length - 1

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, i) => {
        const isLast = i === lastWordIndex

        // Build the last word so the trailing "a" can carry a superscript asterisk.
        let content: ReactNode = word
        if (isLast && showAsterisk) {
          const lastChar = word.slice(-1)
          const head = word.slice(0, -1)
          content = (
            <span className="relative inline-block">
              {head}
              <span className="relative inline-block">
                {lastChar}
                <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">
                  *
                </span>
              </span>
            </span>
          )
        }

        return (
          <motion.span
            key={i}
            variants={wordVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            transition={{
              duration: 0.6,
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
            style={{ paddingRight: isLast ? 0 : '0.25em' }}
          >
            {content}
          </motion.span>
        )
      })}
    </div>
  )
}
