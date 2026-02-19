"use client"

import { useEffect, useRef, useState } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { ResultsPanel } from "@/components/results-panel"
import { useDashboard } from "@/lib/dashboard-context"
import { Button } from "@/components/ui/button"
import { PanelLeftOpen } from "lucide-react"
import mexicoDemoResponse from "@/datatoimport/response_constructionMexico.json"

const MEXICO_DEMO_QUERY = "construction companies in monterrey, mexico"

export default function HexOutboundLeadGenPage() {
  const { importExtractionFromJson } = useDashboard()
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const hasImportedDemoData = useRef(false)

  useEffect(() => {
    if (hasImportedDemoData.current) return
    importExtractionFromJson(mexicoDemoResponse)
    hasImportedDemoData.current = true
  }, [importExtractionFromJson])

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-background">
      <div className={isFocusMode ? "fixed inset-0 z-[60] flex min-h-0 flex-1 flex-col bg-background" : "relative flex min-h-0 flex-1 flex-col lg:flex-row"}>
        {!isFocusMode && !isChatCollapsed && (
          <div className="flex h-[44vh] flex-col border-r border-border/50 lg:h-auto lg:w-[360px] lg:shrink-0 xl:w-[380px]">
            <ChatPanel
              onCollapse={() => setIsChatCollapsed(true)}
              mockUserInput={MEXICO_DEMO_QUERY}
            />
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col">
          {!isFocusMode && isChatCollapsed && (
            <div className="border-b border-border/50 bg-background/80 px-4 py-2 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl bg-transparent text-xs"
                onClick={() => setIsChatCollapsed(false)}
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
                Lead Insights
              </Button>
            </div>
          )}
          <ResultsPanel
            demoMode
            isFocusMode={isFocusMode}
            onToggleFocus={() => setIsFocusMode((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  )
}
