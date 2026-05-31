import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import WordsPullUpMultiStyle from './WordsPullUpMultiStyle'

const BODY_TEXT =
  'Over the last seven years, I have worked with Parallax, a Berlin-based production house that crafts cinema, series, and Noir Studio in Paris. Together, we have created work that has earned international acclaim at several major festivals.'

interface AnimatedLetterProps {
  char: string
  index: number
  total: number
  progress: MotionValue<number>
}

function AnimatedLetter({ char, index, total, progress }: AnimatedLetterProps) {
  const charProgress = index / total
  const opacity = useTransform(
    progress,
    [charProgress - 0.1, charProgress + 0.05],
    [0.2, 1],
  )

  return <motion.span style={{ opacity }}>{char}</motion.span>
}

export default function About() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  })

  const chars = BODY_TEXT.split('')

  return (
    <section className="bg-black px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-6xl rounded-2xl bg-[#101010] px-6 py-16 text-center sm:px-10 md:rounded-[2rem] md:px-16 md:py-24">
        {/* Label */}
        <p className="mb-8 text-[10px] uppercase tracking-wide text-primary sm:text-xs">
          Visual arts
        </p>

        {/* Main heading */}
        <WordsPullUpMultiStyle
          className="mx-auto max-w-3xl text-3xl leading-[0.95] sm:text-4xl sm:leading-[0.9] md:text-5xl lg:text-6xl xl:text-7xl"
          segments={[
            { text: 'I am Marcus Chen,', className: 'font-normal' },
            {
              text: 'a self-taught director.',
              className: 'italic font-serif',
            },
            {
              text: 'I have skills in color grading, visual effects, and narrative design.',
              className: 'font-normal',
            },
          ]}
        />

        {/* Body paragraph with scroll-linked character reveal */}
        <div
          ref={containerRef}
          className="mx-auto mt-12 max-w-2xl text-xs text-[#DEDBC8] sm:text-sm md:text-base"
        >
          {chars.map((char, i) => (
            <AnimatedLetter
              key={i}
              char={char}
              index={i}
              total={chars.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
