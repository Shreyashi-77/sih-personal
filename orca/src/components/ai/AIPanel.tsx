import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { AiChat02Icon, ArrowRight01Icon, Mic01Icon, Cancel01Icon, ShipIcon } from '@hugeicons/core-free-icons'
import { useLanguage } from '@/lib/i18n'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  chatFishery,
  clearChatSessions,
  createChatSession,
  deleteChatSession,
  getChatSession,
  getChatSessions,
  type ChatSession,
} from '@/lib/api'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function AIPanel({ isOpen, onClose, initialQuery = '' }: AIPanelProps) {
  const { t } = useLanguage()
  const geo = useGeolocation()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState(initialQuery)
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('orca_session_id'))
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const requestControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isOpen) {
      setHistoryLoading(true)
      const loadHistory = async () => {
        try {
          const availableSessions = await getChatSessions()
          setSessions(availableSessions)
          const savedSessionId = localStorage.getItem('orca_session_id')
          if (savedSessionId && availableSessions.some((session) => session.session_id === savedSessionId)) {
            const activeSession = await getChatSession(savedSessionId)
            setSessionId(savedSessionId)
            setMessages(activeSession.history.map((turn, index) => ({
              id: `${savedSessionId}-${index}`,
              role: turn.role === 'user' ? 'user' : 'assistant',
              content: turn.content,
            })))
          } else {
            setSessionId(null)
            localStorage.removeItem('orca_session_id')
            setMessages([])
          }
        } catch (error) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load chat history.')
        } finally {
          setHistoryLoading(false)
        }
      }

      void loadHistory()
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && initialQuery && messages.length === 0 && !historyLoading) {
      void handleSend(initialQuery)
    }
  }, [isOpen, initialQuery, messages.length, historyLoading])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!isOpen) {
      requestControllerRef.current?.abort()
    }
  }, [isOpen])

  const handleSend = async (text: string) => {
    if (!text.trim()) return

    if (geo.lat === null || geo.lon === null) {
      setRequestError(geo.error || 'Your location is required before ORCA can prepare a local marine advisory.')
      return
    }

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, newUserMsg])
    setInputValue('')
    setIsTyping(true)
    setRequestError(null)
    const controller = new AbortController()
    requestControllerRef.current = controller

    try {
      let activeSessionId = sessionId
      if (!activeSessionId) {
        const session = await createChatSession()
        activeSessionId = session.session_id
        setSessionId(activeSessionId)
        localStorage.setItem('orca_session_id', activeSessionId)
      }
      const response = await chatFishery(text, geo.lat, geo.lon, activeSessionId, controller.signal)
      setSessionId(response.session_id)
      localStorage.setItem('orca_session_id', response.session_id)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply
      }])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Unable to get an advisory.'
      setRequestError(message)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Unable to get an advisory: ${message}`
      }])
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
        setIsTyping(false)
      }
    }
  }

  const stopResponse = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setIsTyping(false)
  }

  const startNewChat = async () => {
    try {
      const session = await createChatSession()
      setSessions((current) => [session, ...current])
      setSessionId(session.session_id)
      setMessages([])
      setRequestError(null)
      localStorage.setItem('orca_session_id', session.session_id)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to start a new chat.')
    }
  }

  const selectChat = async (selectedSessionId: string) => {
    if (selectedSessionId === sessionId) return
    setHistoryLoading(true)
    try {
      const selectedSession = await getChatSession(selectedSessionId)
      setSessionId(selectedSessionId)
      setMessages(selectedSession.history.map((turn, index) => ({
        id: `${selectedSessionId}-${index}`,
        role: turn.role === 'user' ? 'user' : 'assistant',
        content: turn.content,
      })))
      localStorage.setItem('orca_session_id', selectedSessionId)
      setRequestError(null)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to open that chat.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const removeCurrentChat = async () => {
    if (!sessionId) return
    try {
      await deleteChatSession(sessionId)
      const remaining = sessions.filter((session) => session.session_id !== sessionId)
      setSessions(remaining)
      setSessionId(null)
      setMessages([])
      localStorage.removeItem('orca_session_id')
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to delete that chat.')
    }
  }

  const removeAllChats = async () => {
    if (sessions.length === 0 || !window.confirm('Delete all saved chats? This cannot be undone.')) return

    setHistoryLoading(true)
    try {
      await clearChatSessions()
      setSessions([])
      setSessionId(null)
      setMessages([])
      localStorage.removeItem('orca_session_id')
      setRequestError(null)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to delete chat history.')
    } finally {
      setHistoryLoading(false)
    }
  }

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
        setInputValue(finalTranscript)
        handleSend(finalTranscript)
      }
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HugeiconsIcon icon={AiChat02Icon} size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-none mb-1">ORCA Intelligence</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Online and analyzing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory((visible) => !visible)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            {showHistory ? 'Hide history' : 'Show history'}
          </button>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Close chat">
            <HugeiconsIcon icon={Cancel01Icon} size={24} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showHistory && (
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-border/40 bg-card/30 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Chat history</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => void startNewChat()} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">
                  New chat
                </button>
                <button
                  onClick={() => void removeAllChats()}
                  disabled={sessions.length === 0 || historyLoading}
                  className="rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete all
                </button>
              </div>
            </div>
            {historyLoading && <p className="mb-3 text-xs text-muted-foreground">Loading history...</p>}
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => void selectChat(session.session_id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${session.session_id === sessionId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                >
                  <span className="block truncate">{session.title}</span>
                </button>
              ))}
              {!historyLoading && sessions.length === 0 && <p className="text-xs text-muted-foreground">No saved chats yet.</p>}
            </div>
            {sessionId && <button onClick={() => void removeCurrentChat()} className="mt-5 text-xs text-red-500 hover:text-red-600">Delete current chat</button>}
          </aside>
        )}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {(geo.error || requestError) && (
          <div role="alert" className="max-w-4xl mx-auto rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {requestError || `Location error: ${geo.error}`}
          </div>
        )}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6">
              <HugeiconsIcon icon={ShipIcon} size={40} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-medium mb-2">How can I assist your voyage?</h3>
            <p className="text-muted-foreground max-w-sm">
              Ask me about PFZ locations, safety alerts, optimal routes, or current oceanic conditions.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-md">
              <button onClick={() => handleSend("Find the nearest PFZ")} className="px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors border border-border/50">Find nearest PFZ</button>
              <button onClick={() => handleSend("What is the weather like?")} className="px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors border border-border/50">Weather forecast</button>
              <button onClick={() => handleSend("Are there any safety warnings?")} className="px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm transition-colors border border-border/50">Safety warnings</button>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-card border border-border/40 shadow-sm rounded-tl-sm'
              }`}>
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-card border border-border/40 shadow-sm rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center h-12">
              <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card/80 backdrop-blur-md border-t border-border/40">
        <div className="max-w-4xl mx-auto relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(inputValue)
            }}
            placeholder={t('ask_orca')}
            className="w-full h-14 pl-14 pr-14 rounded-2xl bg-muted/50 border border-border/50 focus:bg-background focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-base shadow-sm"
          />
          <button
            onClick={toggleVoiceInput}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                       ${isListening ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            <HugeiconsIcon icon={Mic01Icon} size={20} />
          </button>
          {isTyping ? (
            <button
              type="button"
              onClick={stopResponse}
              title="Stop response"
              aria-label="Stop response"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-red-500 transition-colors shadow-sm"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors shadow-sm"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
