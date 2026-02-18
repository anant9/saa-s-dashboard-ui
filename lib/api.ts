export interface BusinessResponse {
  name: string
  title?: string
  subTitle?: string
  place_id: string
  types: string[]
  categoryName?: string
  address?: string
  neighborhood?: string
  street?: string
  postalCode?: string
  countryCode?: string
  phone?: string
  phoneUnformatted?: string
  claimThisBusiness?: boolean
  totalScore?: number
  permanentlyClosed?: boolean
  temporarilyClosed?: boolean
  fid?: string
  cid?: string
  reviewsCount?: number
  imagesCount?: number
  imageCategories?: string[]
  scrapedAt?: string
  googleFoodUrl?: string
  peopleAlsoSearch?: string[]
  placesTags?: string[]
  reviewsTags?: string[]
  additionalInfo?: Record<string, unknown> | null
  gasPrices?: Record<string, unknown> | null
  url?: string
  searchPageUrl?: string
  searchString?: string
  language?: string
  rank?: number
  isAdvertisement?: boolean
  imageUrl?: string
  kgmid?: string
  primary_type?: string
  price?: string
  reviews_distribution?: {
    oneStar?: number
    twoStar?: number
    threeStar?: number
    fourStar?: number
    fiveStar?: number
  } | null
  additional_info?: Record<string, unknown> | null
  opening_hours_raw?: { day?: string; hours?: string }[]
  search_string?: string
  search_page_url?: string
  scraped_at?: string
  image_url?: string
  images_count?: number
  is_advertisement?: boolean
  permanently_closed?: boolean
  temporarily_closed?: boolean
  claim_this_business?: boolean
  country_code?: string
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
  openingHours?: {
    openNow?: boolean
    weekdayText?: string[]
  }
  photos?: string[]
  [key: string]: unknown
}

export interface SearchResultsResponse {
  total_results: number
  results: BusinessResponse[]
  query: {
    query?: string
    type?: string
    website_url?: string
    language?: string
    suggested_queries?: string[]
    [key: string]: unknown
  }
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
