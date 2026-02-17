"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react"
import type {
  ChatMessage,
  ExtractionRun,
  ExtractionFilter,
  SavedSearch,
  BusinessResult,
} from "./types"
import {
  PRICE_PER_RESULT,
  estimateCost,
  mockSavedSearches,
} from "./mock-data"
import { searchBusinesses } from "./api"

interface DashboardContextType {
  messages: ChatMessage[]
  extraction: ExtractionRun
  isTyping: boolean
  showConfirmation: boolean
  pendingFilter: ExtractionFilter | null
  savedSearches: SavedSearch[]
  sendMessage: (content: string) => void
  importExtractionFromJson: (payload: unknown) => void
  confirmExtraction: (filter?: ExtractionFilter) => void
  cancelExtraction: () => void
  openConfirmation: () => void
  onSaveSearch: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
)

const initialExtraction: ExtractionRun = {
  id: "",
  totalResults: 0,
  creditsUsed: 0,
  costAmount: 0,
  results: [],
  status: "idle",
}

const WELCOME_MSG: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! How can I help you? ",
  timestamp: new Date(),
}

export function DashboardProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [extraction, setExtraction] = useState<ExtractionRun>(initialExtraction)
  const [isTyping, setIsTyping] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingFilter, setPendingFilter] = useState<ExtractionFilter | null>(null)
  const [pendingQueryText, setPendingQueryText] = useState<string | null>(null)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(mockSavedSearches)
  const idCounter = useRef(0)

  const genId = () => {
    idCounter.current += 1
    return `msg_${idCounter.current}_${Date.now()}`
  }

  const mapSearchResults = useCallback((results: Awaited<ReturnType<typeof searchBusinesses>>["results"]): BusinessResult[] => {
    const pick = <T,>(...values: Array<T | null | undefined>): T | undefined => {
      for (const value of values) {
        if (value !== undefined && value !== null) return value
      }
      return undefined
    }

    const normalizeAdditionalInfo = (payload: unknown): Record<string, string[]> => {
      if (!payload || typeof payload !== "object") return {}

      const result: Record<string, string[]> = {}
      for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
        if (!Array.isArray(value)) continue

        const normalizedValues = value
          .map((item) => {
            if (typeof item === "string") return item
            if (!item || typeof item !== "object") return ""

            return Object.entries(item as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(", ")
          })
          .filter((entry) => entry.length > 0)

        if (normalizedValues.length > 0) {
          result[key] = normalizedValues
        }
      }

      return result
    }

    const normalizeUrl = (value: unknown): string | null => {
      if (typeof value !== "string") return null
      const cleaned = value.trim().replace(/\s+/g, "")
      if (!cleaned) return null
      if (!/^https?:\/\//i.test(cleaned)) return null
      return cleaned
    }

    const normalizeOpeningHours = (biz: Awaited<ReturnType<typeof searchBusinesses>>["results"][number]) => {
      const allDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ] as const

      const canonicalDayMap: Record<string, (typeof allDays)[number]> = {
        mon: "Monday",
        monday: "Monday",
        tue: "Tuesday",
        tues: "Tuesday",
        tuesday: "Tuesday",
        wed: "Wednesday",
        wednesday: "Wednesday",
        thu: "Thursday",
        thur: "Thursday",
        thurs: "Thursday",
        thursday: "Thursday",
        fri: "Friday",
        friday: "Friday",
        sat: "Saturday",
        saturday: "Saturday",
        sun: "Sunday",
        sunday: "Sunday",
      }

      const toCanonicalDay = (day: string) => {
        const normalized = day.trim().toLowerCase().replace(/\.$/, "")
        return canonicalDayMap[normalized]
      }

      const dayHours = new Map<(typeof allDays)[number], string>()

      const weekdayText = pick(
        biz.opening_hours?.weekday_text,
        (biz.openingHours as { weekdayText?: string[] } | undefined)?.weekdayText,
      )

      const raw = pick(
        biz.opening_hours_raw,
        (biz as { openingHoursRaw?: { day?: string; hours?: string }[] }).openingHoursRaw,
      )

      const hasOpeningHours =
        (Array.isArray(weekdayText) && weekdayText.length > 0)
        || (Array.isArray(raw) && raw.length > 0)

      if (Array.isArray(weekdayText) && weekdayText.length > 0) {
        weekdayText.forEach((line) => {
          const [day, ...rest] = line.split(":")
          const canonicalDay = toCanonicalDay(day)
          if (!canonicalDay) return
          dayHours.set(canonicalDay, rest.join(":").trim() || "Closed")
        })
      } else {
        if (Array.isArray(raw)) {
          raw.forEach((item) => {
            const day = item.day || ""
            const canonicalDay = toCanonicalDay(day)
            if (!canonicalDay) return
            dayHours.set(canonicalDay, (item.hours || "").trim() || "Closed")
          })
        }
      }

      if (!hasOpeningHours) {
        return {
          hours: [] as { day: string; hours: string }[],
          hasOpeningHours: false,
        }
      }

      return {
        hours: allDays.map((day) => ({
          day,
          hours: dayHours.get(day) || "Closed",
        })),
        hasOpeningHours: true,
      }
    }

    return results.map((biz, index) => {
      const rating = pick(biz.rating, biz.totalScore, 0) ?? 0
      const reviews = pick(biz.user_ratings_total, biz.reviewsCount, 0) ?? 0
      const leadScore = rating >= 4.5 && reviews >= 50 ? "hot" : rating >= 4.0 ? "warm" : "cold"
      const { hours: openingHours, hasOpeningHours } = normalizeOpeningHours(biz)

      const hasReviewBreakdown = Boolean(
        biz.reviews_distribution && typeof biz.reviews_distribution === "object",
      )

      const reviewsDistribution = biz.reviews_distribution
        ? {
            oneStar: biz.reviews_distribution.oneStar ?? 0,
            twoStar: biz.reviews_distribution.twoStar ?? 0,
            threeStar: biz.reviews_distribution.threeStar ?? 0,
            fourStar: biz.reviews_distribution.fourStar ?? 0,
            fiveStar: biz.reviews_distribution.fiveStar ?? 0,
          }
        : {
            oneStar: 0,
            twoStar: 0,
            threeStar: 0,
            fourStar: 0,
            fiveStar: 0,
          }

      const claimThisBusiness = pick(
        biz.claim_this_business,
        biz.claimThisBusiness,
      )

      return {
        id: biz.place_id || `biz_${index}`,
        title: pick(biz.name, biz.title, "Unknown") || "Unknown",
        subtitle: pick(biz.subTitle, biz.primary_type, null) || null,
        categoryName: pick(biz.categoryName, biz.primary_type, biz.types?.[0], "Business") || "Business",
        categories: biz.types || [],
        address: pick(biz.formatted_address, biz.address, "") || "",
        neighborhood: biz.neighborhood || "",
        street: biz.street || "",
        city: biz.city || "",
        postalCode: pick(biz.postal_code, biz.postalCode, "") || "",
        state: biz.state || "",
        countryCode: pick(
          biz.country,
          biz.country_code,
          biz.countryCode,
          biz["counntry"] as string | undefined,
          "",
        ) || "",
        phone: pick(biz.international_phone_number, biz.formatted_phone_number, biz.phone, null) || null,
        website: normalizeUrl(biz.website),
        url: normalizeUrl(pick(biz.google_maps_url, biz.url, "")) || "",
        totalScore: rating,
        reviewsCount: reviews,
        reviewsDistribution,
        hasReviewBreakdown,
        hasOpeningHours,
        imageUrl: normalizeUrl(pick(biz.image_url, biz.imageUrl, biz.photos?.[0], null)),
        location: { lat: biz.latitude, lng: biz.longitude },
        placeId: biz.place_id || "",
        cid: biz.cid || "",
        permanentlyClosed: pick(
          biz.permanently_closed,
          biz.permanentlyClosed,
          (biz.business_status || "").toLowerCase().includes("permanently"),
          false,
        ) || false,
        temporarilyClosed: pick(
          biz.temporarily_closed,
          biz.temporarilyClosed,
          (biz.business_status || "").toLowerCase().includes("temporarily"),
          false,
        ) || false,
        openingHours,
        plusCode: null,
        price: pick(biz.price_level, biz.price, null) || null,
        menu: normalizeUrl(pick(biz.googleFoodUrl, null)),
        description: null,
        additionalInfo: normalizeAdditionalInfo(pick(biz.additional_info, biz.additionalInfo) || {}),
        reservationLinks: [],
        orderLinks: [],
        emails: [],
        socialMedia: [],
        claimStatus:
          claimThisBusiness === true
            ? "Claimed"
            : claimThisBusiness === false
              ? "Unclaimed"
              : "Unknown",
        isAdvertisement: pick(biz.is_advertisement, biz.isAdvertisement, false) || false,
        leadScore,
        rank: biz.rank ?? null,
        fid: biz.fid || null,
        kgmid: biz.kgmid || null,
        imageUrlRaw: normalizeUrl(pick(biz.image_url, biz.imageUrl, null)),
        imagesCount: pick(biz.images_count, biz.imagesCount, null) || null,
        phoneUnformatted: biz.phoneUnformatted || null,
        scrapedAt: pick(biz.scraped_at, biz.scrapedAt, null) || null,
        searchString: pick(biz.search_string, biz.searchString, null) || null,
        searchPageUrl: normalizeUrl(pick(biz.search_page_url, biz.searchPageUrl, null)),
        imageCategories: biz.imageCategories || [],
        placesTags: biz.placesTags || [],
        reviewsTags: biz.reviewsTags || [],
        peopleAlsoSearch: biz.peopleAlsoSearch || [],
        gasPrices: biz.gasPrices || null,
      }
    })
  }, [])

  const parseImportedPayload = useCallback((payload: unknown) => {
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" && value !== null

    if (Array.isArray(payload)) {
      return {
        results: payload,
        declaredTotal: payload.length,
      }
    }

    if (!isRecord(payload)) {
      throw new Error("Imported JSON must be an object or array")
    }

    const rootResults = Array.isArray(payload.results) ? payload.results : null

    const data = isRecord(payload.data) ? payload.data : null
    const dataResults = data && Array.isArray(data.results) ? data.results : null

    const extractionNode = isRecord(payload.extraction) ? payload.extraction : null
    const extractionResults =
      extractionNode && Array.isArray(extractionNode.results)
        ? extractionNode.results
        : null

    const extractedResults = rootResults || dataResults || extractionResults
    if (!extractedResults) {
      throw new Error("Could not find a results array in imported JSON")
    }

    const rootTotal = typeof payload.total_results === "number"
      ? payload.total_results
      : typeof payload.totalResults === "number"
        ? payload.totalResults
        : null

    return {
      results: extractedResults,
      declaredTotal: rootTotal ?? extractedResults.length,
    }
  }, [])

  const applyExtractionResults = useCallback((
    rawResults: Awaited<ReturnType<typeof searchBusinesses>>["results"],
    successMessage: string,
  ) => {
    const results = mapSearchResults(rawResults)
    const count = results.length
    const cost = count * PRICE_PER_RESULT

    setExtraction({
      id: `ext_${Date.now()}`,
      totalResults: count,
      creditsUsed: count,
      costAmount: cost,
      results,
      status: "success",
    })

    const doneMsg: ChatMessage = {
      id: genId(),
      role: "assistant",
      content: successMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, doneMsg])
  }, [mapSearchResults])

  const importExtractionFromJson = useCallback((payload: unknown) => {
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" && value !== null

    const { results: rawCandidates, declaredTotal } = parseImportedPayload(payload)

    const safeRawResults = rawCandidates.filter(
      (item): item is Awaited<ReturnType<typeof searchBusinesses>>["results"][number] =>
        isRecord(item),
    )

    applyExtractionResults(
      safeRawResults,
      `Imported ${safeRawResults.length} businesses from JSON.`,
    )

    if (typeof declaredTotal === "number" && declaredTotal !== safeRawResults.length) {
      const noteMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: `Imported ${safeRawResults.length} valid records (source declared ${declaredTotal}).`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, noteMsg])
    }
  }, [applyExtractionResults, parseImportedPayload])

  const openConfirmation = useCallback(() => {
    setShowConfirmation(true)
  }, [])

  const confirmExtraction = useCallback(async (filterArg?: ExtractionFilter) => {
    const activeFilter = filterArg || pendingFilter
    if (!activeFilter) return
    setShowConfirmation(false)

    setExtraction({
      id: `ext_${Date.now()}`,
      totalResults: 0,
      creditsUsed: 0,
      costAmount: 0,
      results: [],
      status: "loading",
    })

    try {
      const naturalQuery = activeFilter.searchQuery
      const response = await searchBusinesses(naturalQuery, activeFilter.maxResults)
      applyExtractionResults(
        response.results,
        `Here are your results — ${response.results.length} businesses shown on the right side.`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch results"
      setExtraction({
        id: `ext_${Date.now()}`,
        totalResults: 0,
        creditsUsed: 0,
        costAmount: 0,
        results: [],
        status: "error",
        errorMessage: message,
      })

      const errorMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: `Could not fetch results. ${message}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }
  }, [pendingFilter, pendingQueryText, applyExtractionResults])

  const sendMessage = useCallback(async (content: string) => {
    const normalized = content.trim().toLowerCase()
    const query = content.trim()
    if (!query) return

    const isConfirm = ["go ahead", "confirm", "run", "start", "yes", "ok", "okay"].includes(normalized)
    if (isConfirm && pendingFilter) {
      setIsTyping(true)
      await confirmExtraction(pendingFilter)
      setIsTyping(false)
      return
    }

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: query,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    const greetingLike = ["hi", "hello", "hey", "help", "thanks", "thank you"].includes(normalized)
    if (greetingLike) {
      const quickHelpMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: "Hi! I can run searches for you. Try:\n- Car wash in Berlin\n- Spa in Thailand\n- Dentists in Tokyo",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, quickHelpMsg])
      return
    }

    const defaultMaxResults = 5
    const directFilter: ExtractionFilter = {
      searchQuery: query,
      locationQuery: "As provided",
      maxResults: defaultMaxResults,
      language: "en",
      region: "us",
      skipClosedPlaces: true,
      scrapeEmails: true,
      scrapeSocialMedia: true,
      scrapeReviewsDetail: false,
      maxReviews: 0,
      estimatedCredits: defaultMaxResults,
      costEstimate: estimateCost(defaultMaxResults),
    }

    setPendingFilter(directFilter)
    setPendingQueryText(query)
    setIsTyping(true)
    await confirmExtraction(directFilter)
    setIsTyping(false)
  }, [pendingFilter, confirmExtraction])

  const cancelExtraction = useCallback(() => {
    setShowConfirmation(false)
    setPendingFilter(null)
    const msg: ChatMessage = {
      id: genId(),
      role: "assistant",
      content: "Extraction cancelled. Feel free to try a different query.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, msg])
  }, [])

  const onSaveSearch = useCallback(() => {
    if (extraction.status !== "success") return
    const filter = pendingFilter || {
      searchQuery: "Custom search",
      locationQuery: "Unknown",
      maxResults: extraction.totalResults,
      language: "en",
      region: "us",
      skipClosedPlaces: true,
      scrapeEmails: true,
      scrapeSocialMedia: true,
      scrapeReviewsDetail: false,
      maxReviews: 0,
      estimatedCredits: extraction.creditsUsed,
      costEstimate: `$${extraction.costAmount.toFixed(2)}`,
    }
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
    const saved: SavedSearch = {
      id: `ss-${Date.now()}`,
      name: `${filter.searchQuery} in ${filter.locationQuery}`,
      query: lastUserMsg?.content || filter.searchQuery,
      filters: filter,
      resultsCount: extraction.totalResults,
      creditsUsed: extraction.creditsUsed,
      costAmount: extraction.costAmount,
      createdAt: new Date(),
      status: "completed",
    }
    setSavedSearches((prev) => [saved, ...prev])
  }, [pendingFilter, extraction, messages])

  return (
    <DashboardContext.Provider
      value={{
        messages,
        extraction,
        isTyping,
        showConfirmation,
        pendingFilter,
        savedSearches,
        sendMessage,
        importExtractionFromJson,
        confirmExtraction,
        cancelExtraction,
        openConfirmation,
        onSaveSearch,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}
