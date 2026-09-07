import { useState, useCallback, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { AiChat02Icon, ArrowRight01Icon, Mic01Icon } from '@hugeicons/core-free-icons'
import { useLanguage } from '@/lib/i18n'
import { AIPanel } from './AIPanel'

export function AIChatBar() {
  const { t } = useLanguage()
  const [message, setMessage] = useState('')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const handleSubmit = useCallback(() => {
    setIsPanelOpen(true) // Open panel even if empty, but initialQuery handles passing the text
  }, [message])

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      handleSubmit()
    },
    [handleSubmit]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support voice input.")
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) {
        setMessage(finalTranscript)
        // Automatically open panel and send when done speaking
        setIsPanelOpen(true)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <div className="rounded-2xl shadow-sm border border-border/40 bg-card p-4 shrink-0">
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center gap-4 h-14 px-4 rounded-xl bg-blue-50/50 dark:bg-muted/30 border border-blue-100/50 dark:border-border/50 transition-colors focus-within:bg-blue-50/80 dark:focus-within:bg-muted/50 focus-within:border-primary/20"
      >
        {/* AI icon */}
        <div className="flex items-center justify-center shrink-0 text-primary">
          <HugeiconsIcon icon={AiChat02Icon} size={24} />
        </div>

        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsPanelOpen(true)}
          placeholder={t('ask_orca')}
          className="flex-1 min-w-0 h-10 px-2 text-[15px] font-medium
                     bg-transparent border-none
                     placeholder:text-muted-foreground/70 text-foreground
                     focus:outline-none focus:ring-0"
          aria-label="Ask ORCA AI assistant"
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-lg
                     transition-all focus-visible:outline-2 focus-visible:outline-primary active:scale-95
                     ${isListening ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          aria-label="Voice input"
        >
          <HugeiconsIcon icon={Mic01Icon} size={20} />
        </button>

        {/* Send button */}
        <button
          type="submit"
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg
                     text-primary bg-primary/10 hover:bg-primary/20
                     focus-visible:outline-2 focus-visible:outline-primary
                     active:scale-95 transition-all"
          aria-label="Open AI Panel"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
        </button>
      </form>

      {/* Full Page AI Panel */}
      <AIPanel 
        isOpen={isPanelOpen} 
        onClose={() => {
          setIsPanelOpen(false)
          setMessage('') // Reset when closed
        }} 
        initialQuery={message} 
      />
    </div>
  )
}
