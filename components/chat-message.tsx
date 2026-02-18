"use client"

import { cn } from "@/lib/utils"
import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { BrainCircuit, User } from "lucide-react"

interface ChatMessageProps {
  message: ChatMessageType
}

function formatMessageTime(timestamp: Date) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const hours = date.getHours()
  const hour12 = hours % 12 || 12
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const meridiem = hours >= 12 ? "pm" : "am"
  return `${hour12}:${minutes} ${meridiem}`
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const hasSuggestions = !isUser
    && Array.isArray(message.suggestedQueries)
    && message.suggestedQueries.length > 0

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <BrainCircuit className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {!isUser && (
          <span className="px-1 text-[10px] font-medium text-primary/70">
            AI Agent
          </span>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-md bg-primary text-primary-foreground"
              : "rounded-tl-md bg-muted text-foreground"
          )}
        >
          {message.content}
        </div>

        {hasSuggestions && (
          <div className="flex max-w-full flex-wrap gap-2 px-1">
            {message.suggestedQueries?.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                onClick={() => {
                  const event = new CustomEvent("suggestion-click", {
                    detail: suggestion,
                  })
                  window.dispatchEvent(event)
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}


        <span suppressHydrationWarning className="px-1 text-[10px] text-muted-foreground">
          {formatMessageTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
