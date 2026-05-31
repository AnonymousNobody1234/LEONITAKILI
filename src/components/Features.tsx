import { ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import WordsPullUpMultiStyle from './WordsPullUpMultiStyle'

const cardEase = [0.22, 1, 0.36, 1] as const

interface ChecklistCardData {
  number: string
  title: string
  icon: string
  items: string[]
}

const CHECKLIST_CARDS: ChecklistCardData[] = [
  {
    number: '01',
    title: 'Project Storyboard.',
    icon: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85',
    items: [
      'Visual scene sequencing',
      'Frame-by-frame shot planning',
      'Drag-and-drop composition guides',
      'Collaborative annotations in real time',
    ],
  },
  {
    number: '02',
    title: 'Smart Critiques.',
    icon: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85',
    items: [
      'AI-driven scene analysis',
      'Personalized creative notes',
      'Seamless tool integrations',
    ],
  },
  {
    number: '03',
    title: 'Immersion Capsule.',
    icon: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85',
    items: [
      'Automatic notification silencing',
      'Curated ambient soundscapes',
      'Smart schedule syncing',
    ],
  },
]

interface FeatureCardProps {
  index: number
  children: ReactNode
  className?: string
}

function FeatureCard({ index, children, className = '' }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: cardEase }}
      className={`overflow-hidden rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  )
}

function ChecklistCard({
  data,
  index,
}: {
  data: ChecklistCardData
  index: number
}) {
  return (
    <FeatureCard index={index} className="bg-[#212121]">
      <div className="flex h-full flex-col p-5 sm:p-6">
        {/* Icon */}
        <img
          src={data.icon}
          alt=""
          className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
        />

        {/* Title with number */}
        <h3 className="mt-5 flex items-baseline gap-2 text-lg font-normal text-primary sm:text-xl">
          {data.title}
          <span className="text-xs text-gray-500">{data.number}</span>
        </h3>

        {/* Checklist */}
        <ul className="mt-5 flex flex-col gap-3">
          {data.items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-gray-400">{item}</span>
            </li>
          ))}
        </ul>

        {/* Learn more */}
        <a
          href="#"
          className="mt-auto flex items-center gap-1 pt-6 text-sm text-primary transition-opacity hover:opacity-80"
        >
          Learn more
          <ArrowRight className="h-4 w-4 -rotate-45" />
        </a>
      </div>
    </FeatureCard>
  )
}

export default function Features() {
  return (
    <section className="relative min-h-screen bg-black px-4 py-20 sm:px-6 md:py-28">
      {/* Subtle noise background */}
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <WordsPullUpMultiStyle
            className="text-xl font-normal sm:text-2xl md:text-3xl lg:text-4xl"
            segments={[
              {
                text: 'Studio-grade workflows for visionary creators.',
                className: 'text-primary',
              },
              {
                text: 'Built for pure vision. Powered by art.',
                className: 'text-gray-500',
              },
            ]}
          />
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 gap-3 sm:gap-2 md:grid-cols-2 md:gap-1 lg:h-[480px] lg:grid-cols-4">
          {/* Card 1 - Video card */}
          <FeatureCard index={0} className="relative min-h-[280px] lg:min-h-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <p
                className="text-lg font-normal sm:text-xl"
                style={{ color: '#E1E0CC' }}
              >
                Your creative canvas.
              </p>
            </div>
          </FeatureCard>

          {/* Cards 2-4 - Checklist cards */}
          {CHECKLIST_CARDS.map((card, i) => (
            <ChecklistCard key={card.number} data={card} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
