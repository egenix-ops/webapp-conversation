'use client'
import type { FC } from 'react'
import type { FeedbackFunc } from '../type'
import type { ChatItem, MessageRating, VisionFile } from '@/types/app'
import type { Emoji } from '@/types/tools'
import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import Tooltip from '@/app/components/base/tooltip'
import WorkflowProcess from '@/app/components/workflow/workflow-process'
import { randomString } from '@/utils/string'
import ImageGallery from '../../base/image-gallery'
import LoadingAnim from '../loading-anim'
import Thought from '../thought'

interface IAnswerProps {
  item: ChatItem
  feedbackDisabled: boolean
  onFeedback?: FeedbackFunc
  isResponding?: boolean
  allToolIcons?: Record<string, string | Emoji>
  suggestionClick?: (suggestion: string) => void
}

const RatingIcon: FC<{ isLike: boolean }> = ({ isLike }) =>
  isLike ? <HandThumbUpIcon className="w-4 h-4" /> : <HandThumbDownIcon className="w-4 h-4" />

const IconWrapper: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-lg h-6 w-6 flex items-center justify-center hover:bg-gray-100">
    {children}
  </div>
)

const OperationButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) => (
  <div
    className="relative box-border flex items-center justify-center h-7 w-7 p-0.5 rounded-lg bg-white cursor-pointer text-gray-500 hover:text-gray-800 shadow"
    onClick={onClick}
  >
    {children}
  </div>
)

// 🔊 TTS-hook met Nederlandse stem
const useAnswerTTS = () => {
  const [isSpeaking, setIsSpeaking] = React.useState(false)
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null)

  const pickDutchVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis)
      return null

    const voices = window.speechSynthesis.getVoices()
    if (!voices || !voices.length)
      return null

    // 1) probeer een “mooie” Google-stem (Chrome)
    const preferredNames = ['Google Nederlands', 'Google Dutch', 'Dutch']
    for (const name of preferredNames) {
      const v = voices.find(voice => voice.name.includes(name))
      if (v)
        return v
    }

    // 2) anders: pak eender welke NL-stem
    const byLang = voices.find(
      voice => voice.lang && voice.lang.toLowerCase().startsWith('nl'),
    )
    if (byLang)
      return byLang

    // 3) fallback: eerste beste stem
    return voices[0] || null
  }

  const speak = (text: string) => {
    if (!text)
      return
    if (typeof window === 'undefined' || !window.speechSynthesis)
      return

    const synth = window.speechSynthesis
    // stop wat er eventueel al loopt
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance

    // taal op Nederlands
    utterance.lang = 'nl-NL'

    // kies NL-stem als beschikbaar
    const dutchVoice = pickDutchVoice()
    if (dutchVoice)
      utterance.voice = dutchVoice

    // iets natuurlijker
    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    synth.speak(utterance)
  }

  const stop = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis)
      return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  return { isSpeaking, speak, stop }
}

// Klein speaker-icoontje (inline)
const SpeakerIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 9V15H8L12 19V5L8 9H5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 9.5C15.5 10 15.75 10.75 15.75 12C15.75 13.25 15.5 14 15 14.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M17 7C18.2 8.2 18.75 9.8 18.75 12C18.75 14.2 18.2 15.8 17 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

const Answer: FC<IAnswerProps> = ({
  item,
  feedbackDisabled,
  onFeedback,
  isResponding,
  allToolIcons,
  suggestionClick = () => { },
}) => {
  const { id, content, feedback, agent_thoughts, workflowProcess, suggestedQuestions = [] } = item
  const isAgentMode = !!agent_thoughts && agent_thoughts.length > 0
  const isLast = isResponding

  const { t } = useTranslation()
  const { isSpeaking, speak, stop } = useAnswerTTS()

  const renderFeedback = (rating: MessageRating | undefined) => {
    if (!rating) return null

    const isLike = rating === 'like'
    const className = isLike
      ? 'text-primary-600 bg-primary-100'
      : 'text-red-600 bg-red-100'

    return (
      <Tooltip selector={`fb-${randomString(8)}`} content="Verwijder feedback">
        <div
          className="h-7 w-7 p-0.5 rounded-lg bg-white shadow cursor-pointer"
          onClick={() => onFeedback?.(id, { rating: null })}
        >
          <div className={`${className} rounded-lg h-6 w-6 flex items-center justify-center`}>
            <RatingIcon isLike={isLike} />
          </div>
        </div>
      </Tooltip>
    )
  }

  const renderActions = () => {
    if (feedback?.rating) return null

    return (
      <div className="flex gap-1">
        <Tooltip selector={`like-${randomString(6)}`} content={t('common.operation.like')}>
          <OperationButton onClick={() => onFeedback?.(id, { rating: 'like' })}>
            <IconWrapper>
              <RatingIcon isLike={true} />
            </IconWrapper>
          </OperationButton>
        </Tooltip>

        <Tooltip selector={`dislike-${randomString(6)}`} content={t('common.operation.dislike')}>
          <OperationButton onClick={() => onFeedback?.(id, { rating: 'dislike' })}>
            <IconWrapper>
              <RatingIcon isLike={false} />
            </IconWrapper>
          </OperationButton>
        </Tooltip>
      </div>
    )
  }

  const getImages = (files?: VisionFile[]) =>
    (files || []).filter(f => f.type === 'image' && f.belongs_to === 'assistant')

  const agentAnswer = (
    <div>
      {agent_thoughts?.map((a, index) => (
        <div key={index}>
          {a.thought && <StreamdownMarkdown content={a.thought} />}

          {a.tool && (
            <Thought
              thought={a}
              allToolIcons={allToolIcons || {}}
              isFinished={!!a.observation || !isResponding}
            />
          )}

          {getImages(a.message_files).length > 0 && (
            <ImageGallery srcs={getImages(a.message_files).map(i => i.url)} />
          )}
        </div>
      ))}
    </div>
  )

  const handleSpeakClick = () => {
    if (isSpeaking) {
      stop()
      return
    }

    if (content) {
      speak(content)
    }
    else if (isAgentMode && agent_thoughts?.length) {
      const joined = agent_thoughts
        .map(a => a.thought)
        .filter(Boolean)
        .join('. ')
      speak(joined)
    }
  }

  return (
    <div className="flex items-start gap-3">
      {/* AI Avatar */}
      <div className="w-10 h-10">
        {isLast && (
          <div className="w-10 h-10 flex items-center justify-center">
            <LoadingAnim type="avatar" />
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <div className="bg-gray-100 rounded-2xl p-4 text-sm text-gray-900">

          {workflowProcess && <WorkflowProcess data={workflowProcess} hideInfo />}

          {isResponding && !content && !isAgentMode ? (
            <div className="flex items-center justify-center h-6">
              <LoadingAnim type="text" />
            </div>
          ) : isAgentMode ? (
            agentAnswer
          ) : (
            <StreamdownMarkdown content={content} />
          )}

          {suggestedQuestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {suggestedQuestions.map((s, i) => (
                <Button key={i} className="text-sm" type="link" onClick={() => suggestionClick(s)}>
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Acties rechtsboven: TTS + feedback */}
        <div className="absolute top-[-12px] right-[-12px] flex gap-2 items-center">

          {/* 🔊 TTS knop */}
          <Tooltip
            selector={`speak-${id}`}
            content={isSpeaking ? 'Stop voorlezen' : 'Lees dit antwoord voor'}
          >
            <button
              type="button"
              onClick={handleSpeakClick}
              className={`
                h-7 w-7 p-0.5 rounded-lg bg-white shadow flex items-center justify-center
                ${isSpeaking ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}
              `}
            >
              <SpeakerIcon className="w-4 h-4" />
            </button>
          </Tooltip>

          {!feedbackDisabled && renderActions()}
          {!feedbackDisabled && renderFeedback(feedback?.rating)}
        </div>
      </div>
    </div>
  )
}

export default React.memo(Answer)
