export interface BusinessResponse {
  name: string
  place_id: string
  types: string[]
  primary_type?: string
  business_status?: string
  google_maps_url?: string
  formatted_address?: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  country?: string
  postal_code?: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  price_level?: string
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  photos?: string[]
}

export interface SearchResultsResponse {
  total_results: number
  results: BusinessResponse[]
  query: Record<string, unknown>
}

export interface AgentHistoryMessage {
  role: "user" | "assistant"
  content: string
}

export interface AgentExtractionFilter {
  searchQuery: string
  locationQuery: string
  maxResults: number
  language: string
  region: string
  skipClosedPlaces: boolean
  scrapeEmails: boolean
  scrapeSocialMedia: boolean
  scrapeReviewsDetail: boolean
  maxReviews: number
  estimatedCredits: number
  costEstimate: string
}

export interface AgentChatResponse {
  message: string
  filter?: AgentExtractionFilter
  queryText?: string
  needsConfirmation: boolean
  needsClarification: boolean
  clarificationQuestion?: string
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

function parseApiError(text: string, status: number): string {
  const trimmed = text.trim()
  if (!trimmed) return `Request failed with ${status}`

  try {
    const payload = JSON.parse(trimmed) as { detail?: unknown; message?: unknown }
    if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
      return payload.detail
    }
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message
    }
  } catch {
    // Return raw response text when body is not JSON.
  }

  return trimmed
}

export async function searchBusinesses(
  query: string,
  maxResults: number = 50,
): Promise<SearchResultsResponse> {
  const endpoint = new URL("/api/v1/search/business", API_BASE_URL)

  const requestSearch = async (method: "GET" | "POST") => {
    if (method === "GET") {
      const url = new URL(endpoint.toString())
      url.searchParams.set("query", query)
      url.searchParams.set("max_results", String(maxResults))
      return fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
    }

    return fetch(endpoint.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        query,
        max_results: maxResults,
      }),
    })
  }

  const firstResponse = await requestSearch("GET")
  const response = firstResponse.status === 405
    ? await requestSearch("POST")
    : firstResponse

  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseApiError(text, response.status))
  }

  return response.json()
}

export async function chatWithAgent(
  message: string,
  history: AgentHistoryMessage[] = [],
): Promise<AgentChatResponse> {
  const url = new URL("/api/v1/agent/chat", API_BASE_URL)
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      message,
      history,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseApiError(text, response.status))
  }

  return response.json()
}
