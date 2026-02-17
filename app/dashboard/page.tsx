"use client"

import { useState } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { PanelLeftOpen } from "lucide-react"

export default function DashboardPage() {
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)

  return (
    <div className="relative flex w-full flex-col lg:flex-row">
      {!isChatCollapsed && (
        <div className="flex h-[44vh] flex-col border-r border-border/50 lg:h-auto lg:w-[360px] lg:shrink-0 xl:w-[380px]">
          <ChatPanel onCollapse={() => setIsChatCollapsed(true)} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <ResultsPanel />
      </div>
      {isChatCollapsed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute left-3 top-3 z-20 hidden gap-1.5 rounded-xl bg-background/90 text-xs backdrop-blur-sm lg:inline-flex"
          onClick={() => setIsChatCollapsed(false)}
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
          Lead Insights
        </Button>
      )}
    </div>
  )
}
