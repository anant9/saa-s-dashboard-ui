"use client"

import { useState } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PanelLeftOpen, Target, Search, Building2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react"

const HEX_SEARCH_STRINGS = [
  "electrical control panel manufacturer",
  "LT panel manufacturer",
  "industrial electrical EPC contractor",
  "substation electrical contractor",
  "solar EPC contractor industrial",
]

export default function HexOutboundLeadGenPage() {
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [showBrief, setShowBrief] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  return (
    <div className={isFocusMode ? "fixed inset-0 z-[60] flex min-h-0 w-full flex-col bg-background" : "flex min-h-0 w-full flex-1 flex-col bg-background"}>
      <div className="border-b border-border/50 bg-background/70 px-4 py-4 backdrop-blur-sm lg:px-6">
        <Card className="border-border/60 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1.5 rounded-md" variant="secondary">
                  <Building2 className="h-3.5 w-3.5" />
                  HEX Outbound Lead Gen Demo
                </Badge>
                <Badge variant="outline" className="rounded-md">India market</Badge>
                <Badge variant="outline" className="rounded-md">500 total leads</Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs"
                onClick={() => setShowBrief((prev) => !prev)}
              >
                {showBrief ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showBrief ? "Hide Brief" : "Show Brief"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs"
                onClick={() => setIsFocusMode((prev) => !prev)}
              >
                {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                {isFocusMode ? "Exit Focus" : "Focus Mode"}
              </Button>
            </div>

            {showBrief ? (
              <>
                <p className="text-sm text-muted-foreground">
                  We reviewed HEX Worldwide’s product focus (including switchboard/control panel accessories, cable gland kits,
                  earthing & lightning protection, and cable termination solutions), mapped those strengths to high-intent industrial
                  buyer segments in India, and mapped high-intent industrial buyer segments for outbound outreach. This workflow generated up to <span className="font-medium text-foreground">100 leads per search string</span> across five focused queries.
                </p>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {HEX_SEARCH_STRINGS.map((query) => (
                    <div key={query} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs">
                      <Search className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-foreground">{query}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    locationQuery: India
                  </span>
                  <span>•</span>
                  <span>maxCrawledPlacesPerSearch: 100</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Campaign brief is collapsed to maximize data viewing area. Click <span className="font-medium text-foreground">Show Brief</span> for search rationale and query details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {!isChatCollapsed && (
          <div className="flex h-[44vh] flex-col border-r border-border/50 lg:h-auto lg:w-[360px] lg:shrink-0 xl:w-[380px]">
            <ChatPanel onCollapse={() => setIsChatCollapsed(true)} />
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col">
          <ResultsPanel
            demoMode
            buyerSegmentsLabel="Buyer Segments: Solar EPC • Electrical Panel Builders • Industrial EPC Contractors"
          />
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
    </div>
  )
}
