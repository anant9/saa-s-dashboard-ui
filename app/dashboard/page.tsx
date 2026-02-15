"use client"

import { ChatPanel } from "@/components/chat-panel"
import { ResultsPanel } from "@/components/results-panel"

export default function DashboardPage() {
  return (
    <div className="flex w-full flex-col lg:flex-row">
      <div className="flex h-[44vh] flex-col border-r border-border/50 lg:h-auto lg:w-[360px] lg:shrink-0 xl:w-[380px]">
        <ChatPanel />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ResultsPanel />
      </div>
    </div>
  )
}
