"use client"

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { useDashboard } from "@/lib/dashboard-context"
import { Button } from "@/components/ui/button"
import { Mic, SendHorizontal, Square } from "lucide-react"

const MAX_CHARS = 500

interface BrowserSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal?: boolean
      length: number
      [itemIndex: number]: {
        transcript: string
      }
    }
  }
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface BrowserWindowWithSpeech extends Window {
  SpeechRecognition?: {
    new (): BrowserSpeechRecognition
  }
  webkitSpeechRecognition?: {
    new (): BrowserSpeechRecognition
  }
}

export function ChatInput() {
  const [value, setValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const { sendMessage, isTyping, extraction } = useDashboard()
  const isDisabled = isTyping || extraction.status === "loading"

  useEffect(() => {
    const browserWindow = window as BrowserWindowWithSpeech
    setSpeechSupported(
      Boolean(
        browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition,
      ),
    )
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string
      if (detail && !isDisabled) {
        sendMessage(detail)
      }
    }
    window.addEventListener("suggestion-click", handler)
    return () => window.removeEventListener("suggestion-click", handler)
  }, [isDisabled, sendMessage])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

    sendMessage(trimmed)
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, isDisabled, sendMessage, isListening])

  const handleToggleListening = useCallback(() => {
    if (!speechSupported || isDisabled) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const browserWindow = window as BrowserWindowWithSpeech
    const SpeechRecognitionCtor =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = navigator.language || "en-US"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      let transcript = ""
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript
      }

      const normalizedTranscript = transcript.trim()
      if (!normalizedTranscript) return

      setValue((previousValue) => {
        const separator = previousValue.trim().length > 0 ? " " : ""
        const nextValue = `${previousValue}${separator}${normalizedTranscript}`
        return nextValue.slice(0, MAX_CHARS)
      })

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
        }
      })
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [speechSupported, isDisabled, isListening])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= MAX_CHARS) {
      setValue(newValue)
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="border-t border-border/50 bg-background/80 p-4 backdrop-blur-sm">
      <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-card p-2 transition-colors focus-within:border-primary/40">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled
              ? "Please wait..."
              : "Describe what businesses you want to find..."
          }
          disabled={isDisabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Chat message input"
        />
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {value.length}/{MAX_CHARS}
          </span>
          <Button
            size="icon"
            type="button"
            variant={isListening ? "secondary" : "ghost"}
            className="h-8 w-8 rounded-lg"
            onClick={handleToggleListening}
            disabled={!speechSupported || isDisabled}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={
              speechSupported
                ? isListening
                  ? "Stop voice input"
                  : "Start voice input"
                : "Voice input is not supported in this browser"
            }
          >
            {isListening ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            type="button"
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            onClick={handleSubmit}
            disabled={!value.trim() || isDisabled}
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
