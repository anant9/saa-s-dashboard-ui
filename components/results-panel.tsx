"use client"

import { useEffect, useMemo, useState } from "react"
import { useDashboard } from "@/lib/dashboard-context"
import type { BusinessResult } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { MapView } from "@/components/map-view"
import { ResultsSkeleton } from "@/components/results-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson2,
  AlertCircle,
  Coins,
  Link2,
  CheckCircle2,
  Bookmark,
  BrainCircuit,
  Sparkles,
  TableIcon,
  MapIcon,
  Search,
  FilterX,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  pushLeadsToSalesforce,
  testSalesforceConnection,
  type SalesforceConnectedAppConfig,
} from "@/lib/api"

const CRM_CONNECTORS = [
  { id: "salesforce", name: "Salesforce", icon: "SF", color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  { id: "hubspot", name: "HubSpot", icon: "HS", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  { id: "zoho", name: "Zoho CRM", icon: "ZO", color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  { id: "pipedrive", name: "Pipedrive", icon: "PD", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { id: "close", name: "Close CRM", icon: "CL", color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
]

type ViewMode = "table" | "map"
type LeadFilter = "all" | "hot" | "warm" | "cold"
type StatusFilter = "all" | "open" | "temporarily-closed" | "permanently-closed"

interface ResultsPanelProps {
  demoMode?: boolean
  buyerSegmentsLabel?: string
  isFocusMode?: boolean
  onToggleFocus?: () => void
}

function toExportRows(results: BusinessResult[]) {
  return results.map((biz) => ({
    name: biz.title,
    category: biz.categoryName,
    rating: biz.totalScore,
    reviews_count: biz.reviewsCount,
    status: biz.permanentlyClosed ? "Permanently Closed" : biz.temporarilyClosed ? "Temporarily Closed" : "Open",
    lead_score: biz.leadScore,
    address: biz.address,
    neighborhood: biz.neighborhood,
    street: biz.street,
    city: biz.city,
    state: biz.state,
    postal_code: biz.postalCode,
    country: biz.countryCode,
    latitude: biz.location.lat,
    longitude: biz.location.lng,
    phone: biz.phone || "",
    website: biz.website || "",
    google_maps_url: biz.url,
    image_url: biz.imageUrl || "",
    place_id: biz.placeId,
    cid: biz.cid,
    fid: biz.fid || "",
    kgmid: biz.kgmid || "",
    rank: biz.rank ?? "",
    scraped_at: biz.scrapedAt || "",
    categories: biz.categories.join(" | "),
    opening_hours: biz.openingHours.map((item) => `${item.day}: ${item.hours}`).join(" | "),
  }))
}

function triggerDownload(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return ""

  const headers = Object.keys(rows[0])
  const escapeCell = (value: unknown) => {
    const text = value == null ? "" : String(value)
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
    return text
  }

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ]
  return lines.join("\n")
}

function toSalesforceLeadPayload(results: BusinessResult[]) {
  return results.map((biz) => ({
    company: biz.title,
    website: biz.website || undefined,
    phone: biz.phone || undefined,
    street: biz.street || undefined,
    city: biz.city || undefined,
    state: biz.state || undefined,
    postalCode: biz.postalCode || undefined,
    country: biz.countryCode || undefined,
    description: [
      biz.categoryName ? `Category: ${biz.categoryName}` : "",
      Number.isFinite(biz.totalScore) ? `Rating: ${biz.totalScore}` : "",
      Number.isFinite(biz.reviewsCount) ? `Reviews: ${biz.reviewsCount}` : "",
      biz.url ? `Google Maps: ${biz.url}` : "",
      biz.placeId ? `Place ID: ${biz.placeId}` : "",
      biz.leadScore ? `Lead Score: ${biz.leadScore}` : "",
    ].filter(Boolean).join(" | "),
    sourceSystem: "SAA Dashboard",
    sourceRecordId: biz.id,
    rawData: biz,
  }))
}

export function ResultsPanel({
  demoMode = false,
  buyerSegmentsLabel,
  isFocusMode = false,
  onToggleFocus,
}: ResultsPanelProps) {
  const { extraction, onSaveSearch } = useDashboard()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchTerm, setSearchTerm] = useState("")
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [crmDialogOpen, setCrmDialogOpen] = useState(false)
  const [selectedCrm, setSelectedCrm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [salesforceConfig, setSalesforceConfig] = useState<SalesforceConnectedAppConfig>({
    loginUrl: "https://login.salesforce.com",
    clientId: "",
    clientSecret: "",
    username: "",
    password: "",
    securityToken: "",
    apiVersion: "v61.0",
  })
  const [isTestingSalesforce, setIsTestingSalesforce] = useState(false)
  const [isSyncingSalesforce, setIsSyncingSalesforce] = useState(false)
  const [salesforceConnectionOk, setSalesforceConnectionOk] = useState(false)

  const filteredResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return extraction.results.filter((biz) => {
      const matchesSearch = !query || [
        biz.title,
        biz.categoryName,
        biz.address,
        biz.city,
        biz.state,
        biz.neighborhood,
        biz.phone || "",
        biz.website || "",
      ].join(" ").toLowerCase().includes(query)

      const matchesLead = leadFilter === "all" || biz.leadScore === leadFilter

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "open"
            ? !biz.permanentlyClosed && !biz.temporarilyClosed
            : statusFilter === "temporarily-closed"
              ? biz.temporarilyClosed
              : biz.permanentlyClosed

      return matchesSearch && matchesLead && matchesStatus
    })
  }, [extraction.results, searchTerm, leadFilter, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, leadFilter, statusFilter, pageSize])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredResults.length, pageSize, page])

  const handleExport = async (format: "csv" | "excel" | "json") => {
    if (filteredResults.length === 0) {
      toast.error("No results to export")
      return
    }

    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
    const baseName = `extractai-results-${now}`
    const rows = toExportRows(filteredResults)

    try {
      if (format === "csv") {
        const csv = toCsv(rows)
        triggerDownload(csv, `${baseName}.csv`, "text/csv;charset=utf-8;")
      } else if (format === "json") {
        const json = JSON.stringify(rows, null, 2)
        triggerDownload(json, `${baseName}.json`, "application/json;charset=utf-8;")
      } else {
        const XLSX = await import("xlsx")
        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results")
        XLSX.writeFile(workbook, `${baseName}.xlsx`)
      }

      toast.success("Export complete", {
        description: `${format.toUpperCase()} file downloaded successfully (${filteredResults.length} rows).`,
      })
    } catch (error) {
      toast.error("Export failed", {
        description: "Could not generate file. Please try again.",
      })
    }
  }

  const handleCrmConnect = (crmId: string) => {
    setSelectedCrm(crmId)
    if (crmId === "salesforce") {
      setSalesforceConnectionOk(false)
    }
    setCrmDialogOpen(true)
  }

  const updateSalesforceField = (
    field: keyof SalesforceConnectedAppConfig,
    value: string,
  ) => {
    setSalesforceConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSalesforceConnectionOk(false)
  }

  const validateSalesforceConfig = () => {
    const requiredFields: Array<keyof SalesforceConnectedAppConfig> = [
      "loginUrl",
      "clientId",
      "clientSecret",
      "username",
      "password",
      "securityToken",
    ]

    for (const field of requiredFields) {
      if (!salesforceConfig[field]?.trim()) {
        throw new Error(`Please provide Salesforce ${field}.`)
      }
    }
  }

  const handleSalesforceTestConnection = async () => {
    try {
      validateSalesforceConfig()
      setIsTestingSalesforce(true)
      const response = await testSalesforceConnection(salesforceConfig)
      setSalesforceConnectionOk(Boolean(response.ok))

      if (response.ok) {
        toast.success("Salesforce connection successful", {
          description: response.message || "Connected app credentials are valid.",
        })
      } else {
        toast.error("Salesforce connection failed", {
          description: response.message || "Please review your connected app values.",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not test Salesforce connection."
      setSalesforceConnectionOk(false)
      toast.error("Salesforce connection failed", {
        description: message,
      })
    } finally {
      setIsTestingSalesforce(false)
    }
  }

  const handleCrmSync = async () => {
    const crm = CRM_CONNECTORS.find((c) => c.id === selectedCrm)

    if (selectedCrm === "salesforce") {
      try {
        validateSalesforceConfig()
        setIsSyncingSalesforce(true)

        if (!salesforceConnectionOk) {
          const testResponse = await testSalesforceConnection(salesforceConfig)
          if (!testResponse.ok) {
            throw new Error(testResponse.message || "Salesforce connection test failed.")
          }
          setSalesforceConnectionOk(true)
        }

        const payload = toSalesforceLeadPayload(extraction.results)
        const response = await pushLeadsToSalesforce(salesforceConfig, payload)

        if (!response.ok) {
          throw new Error(response.message || "Salesforce sync failed.")
        }

        toast.success("Salesforce sync complete", {
          description: response.message
            || `Pushed ${response.successCount ?? extraction.totalResults} leads to Salesforce.`,
        })

        setCrmDialogOpen(false)
        setSelectedCrm(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not push leads to Salesforce."
        toast.error("Salesforce sync failed", {
          description: message,
        })
      } finally {
        setIsSyncingSalesforce(false)
      }
      return
    }

    toast.success(`Syncing to ${crm?.name}`, {
      description: `Pushing ${extraction.totalResults} leads to ${crm?.name}...`,
    })
    setCrmDialogOpen(false)
    setSelectedCrm(null)
  }

  const handleSaveQuery = () => {
    onSaveSearch()
    toast.success("Search saved", { description: "You can find it under Saved Searches." })
  }

  const resetFilters = () => {
    setSearchTerm("")
    setLeadFilter("all")
    setStatusFilter("all")
    setPageSize(25)
    setPage(1)
  }

  if (extraction.status === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5">
            <BrainCircuit className="h-10 w-10 text-primary/40" />
          </div>
          <div className="absolute -inset-4 rounded-3xl bg-primary/[0.03] blur-2xl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="flex items-center justify-center gap-2 text-base font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Agent Awaiting Query
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Describe what businesses you need in the chat panel. The AI agent will parse
            your intent, configure extraction, and deliver enriched results here.
          </p>
        </div>
      </div>
    )
  }

  if (extraction.status === "loading") {
    return <ResultsSkeleton />
  }

  if (extraction.status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold text-foreground">Extraction failed</h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {extraction.errorMessage || "Something went wrong. Please try again."}
          </p>
        </div>
        <Button variant="outline" size="sm" className="mt-2 rounded-xl bg-transparent">
          Try Again
        </Button>
      </div>
    )
  }

  const selectedCrmData = CRM_CONNECTORS.find((c) => c.id === selectedCrm)

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                viewMode === "map"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Map
            </button>
          </div>

          <Badge variant="secondary" className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {filteredResults.length} places
          </Badge>
          {!demoMode && (
            <Badge variant="secondary" className="gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Coins className="h-3 w-3" />
              {extraction.creditsUsed} credits
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save Search */}
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl bg-transparent text-xs" onClick={handleSaveQuery}>
            <Bookmark className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl bg-transparent text-xs">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">File Formats</DropdownMenuLabel>
              <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleExport("csv")}>
                <FileText className="h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleExport("json")}>
                <FileJson2 className="h-4 w-4" /> JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* CRM Connectors */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-xl text-xs">
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Push to CRM</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">CRM Connectors</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CRM_CONNECTORS.map((crm) => (
                <DropdownMenuItem key={crm.id} className="gap-3 rounded-lg" onClick={() => handleCrmConnect(crm.id)}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold ${crm.color}`}>
                    {crm.icon}
                  </span>
                  <span>{crm.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {onToggleFocus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl bg-transparent text-xs"
              onClick={onToggleFocus}
            >
              {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFocusMode ? "Exit Focus" : "Focus"}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-border/50 bg-background/70 px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, location, phone..."
              className="h-8 rounded-lg pl-8 text-xs"
            />
          </div>

          <Select value={leadFilter} onValueChange={(value: LeadFilter) => setLeadFilter(value)}>
            <SelectTrigger className="h-8 w-full rounded-lg text-xs lg:w-[130px]">
              <SelectValue placeholder="Lead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-full rounded-lg text-xs lg:w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="temporarily-closed">Temporarily Closed</SelectItem>
              <SelectItem value="permanently-closed">Permanently Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(pageSize)}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-full rounded-lg text-xs lg:w-[120px]">
              <SelectValue placeholder="Rows/page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg bg-transparent px-2.5 text-xs"
            onClick={resetFilters}
          >
            <FilterX className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {filteredResults.length.toLocaleString()} of {extraction.results.length.toLocaleString()} records.
        </p>
        {demoMode && buyerSegmentsLabel && (
          <p className="mt-1 text-xs text-muted-foreground">
            {buyerSegmentsLabel}
          </p>
        )}
      </div>

      {/* Content area - Table or Map */}
      {viewMode === "table" ? (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <DataTable results={filteredResults} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      ) : (
        <div className="flex-1">
          <MapView results={filteredResults} />
        </div>
      )}

      {/* CRM Sync Dialog */}
      <Dialog open={crmDialogOpen} onOpenChange={setCrmDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCrmData && (
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold ${selectedCrmData.color}`}>
                  {selectedCrmData.icon}
                </span>
              )}
              Push to {selectedCrmData?.name}
            </DialogTitle>
            <DialogDescription>
              This will create {extraction.totalResults} new lead records in your {selectedCrmData?.name} account with all extracted business data including contact info, location, reviews, and social links.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Leads to sync</span>
                  <span className="font-medium">{extraction.totalResults}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fields per lead</span>
                  <span className="font-medium">30+ fields</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Includes emails</span>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Includes phone</span>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Includes social profiles</span>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>

            {selectedCrm === "salesforce" && (
              <div className="space-y-3 rounded-xl border border-border/50 bg-background p-4">
                <p className="text-xs font-medium text-foreground">Salesforce Connected App</p>
                <div className="grid gap-2">
                  <Input
                    value={salesforceConfig.loginUrl}
                    onChange={(event) => updateSalesforceField("loginUrl", event.target.value)}
                    placeholder="Login URL (e.g. https://login.salesforce.com)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={salesforceConfig.clientId}
                    onChange={(event) => updateSalesforceField("clientId", event.target.value)}
                    placeholder="Connected App Client ID"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="password"
                    value={salesforceConfig.clientSecret}
                    onChange={(event) => updateSalesforceField("clientSecret", event.target.value)}
                    placeholder="Connected App Client Secret"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={salesforceConfig.username}
                    onChange={(event) => updateSalesforceField("username", event.target.value)}
                    placeholder="Salesforce Username"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="password"
                    value={salesforceConfig.password}
                    onChange={(event) => updateSalesforceField("password", event.target.value)}
                    placeholder="Salesforce Password"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="password"
                    value={salesforceConfig.securityToken}
                    onChange={(event) => updateSalesforceField("securityToken", event.target.value)}
                    placeholder="Security Token"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={salesforceConfig.apiVersion || ""}
                    onChange={(event) => updateSalesforceField("apiVersion", event.target.value)}
                    placeholder="API Version (e.g. v61.0)"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "text-xs",
                    salesforceConnectionOk ? "text-primary" : "text-muted-foreground",
                  )}>
                    {salesforceConnectionOk ? "Connection verified" : "Connection not tested"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg bg-transparent text-xs"
                    onClick={handleSalesforceTestConnection}
                    disabled={isTestingSalesforce || isSyncingSalesforce}
                  >
                    {isTestingSalesforce ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl bg-transparent" onClick={() => setCrmDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleCrmSync}
                disabled={isSyncingSalesforce || isTestingSalesforce}
              >
                {selectedCrm === "salesforce" && isSyncingSalesforce ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
