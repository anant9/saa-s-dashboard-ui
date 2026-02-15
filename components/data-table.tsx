"use client"

import { Fragment, useEffect, useState } from "react"
import type { BusinessResult } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  Mail,
  Globe,
  Phone,
  MapPin,
  Clock,
  Hash,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableProps {
  results: BusinessResult[]
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

function LeadBadge({ score }: { score: string }) {
  const styles: Record<string, string> = {
    hot: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    warm: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    cold: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
  }
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium capitalize", styles[score])}>
      {score}
    </Badge>
  )
}

function RatingStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-medium">{score.toFixed(1)}</span>
    </div>
  )
}

function StatusBadge({ closed, tempClosed }: { closed: boolean; tempClosed: boolean }) {
  if (closed) return <Badge variant="destructive" className="rounded-md text-[11px]">Permanently Closed</Badge>
  if (tempClosed) return <Badge variant="outline" className="rounded-md border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400">Temp Closed</Badge>
  return <Badge variant="outline" className="rounded-md border-emerald-500/20 bg-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-400">Open</Badge>
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {value}
    </p>
  )
}

function formatScrapedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
}

function ExpandedRow({ biz }: { biz: BusinessResult }) {
  const [hideImage, setHideImage] = useState(false)

  useEffect(() => {
    setHideImage(false)
  }, [biz.id, biz.imageUrl])

  const showImage = Boolean(biz.imageUrl) && !hideImage
  const imageUrl = showImage ? biz.imageUrl || undefined : undefined
  const showReviewBreakdown = Boolean(biz.hasReviewBreakdown)
  const showOpeningHours = Boolean(biz.hasOpeningHours)
  const showReviewHoursBlock = showReviewBreakdown || showOpeningHours

  return (
    <TableRow className="border-border/20 bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={10} className="p-0">
        <div className="px-6 py-5">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="h-8 bg-muted/40">
              <TabsTrigger value="overview" className="h-6 px-2.5 text-xs">Overview</TabsTrigger>
              <TabsTrigger value="contacts" className="h-6 px-2.5 text-xs">Contacts</TabsTrigger>
              <TabsTrigger value="details" className="h-6 px-2.5 text-xs">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className={cn("grid grid-cols-1 gap-6", showReviewHoursBlock ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    <DetailItem label="Street" value={biz.street} />
                    <DetailItem label="Neighborhood" value={biz.neighborhood} />
                    <DetailItem label="City" value={`${biz.city}${biz.state ? `, ${biz.state}` : ""}${biz.postalCode ? ` ${biz.postalCode}` : ""}`} />
                    <DetailItem label="Country" value={biz.countryCode} />
                    <DetailItem label="Address" value={biz.address} />
                    <DetailItem label="Plus Code" value={biz.plusCode} />
                    <p><span className="text-muted-foreground">Coords:</span> {biz.location.lat.toFixed(4)}, {biz.location.lng.toFixed(4)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" /> Business
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    {imageUrl && (
                      <div className="space-y-1.5 pb-1">
                        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border/40">
                          <img
                            src={imageUrl}
                            alt={biz.title}
                            className="h-28 w-full object-cover"
                            loading="lazy"
                            onError={() => setHideImage(true)}
                          />
                        </a>
                      </div>
                    )}
                    <DetailItem label="Subtitle" value={biz.subtitle} />
                    <DetailItem label="Category" value={biz.categoryName} />
                    <DetailItem label="Claim Status" value={biz.claimStatus} />
                    {biz.price && <DetailItem label="Price Level" value={biz.price} />}
                    {typeof biz.rank === "number" && <DetailItem label="Rank" value={`#${biz.rank}`} />}
                    {biz.scrapedAt && <DetailItem label="Scraped At" value={formatScrapedAt(biz.scrapedAt)} />}
                    {biz.isAdvertisement && <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-500">Ad</Badge>}
                    {biz.description && <p className="pt-1 text-xs leading-relaxed text-muted-foreground">{biz.description}</p>}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {biz.categories.map((category, index) => (
                        <Badge key={`${category}-${index}`} variant="secondary" className="text-[10px]">{category}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {showReviewHoursBlock && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Star className="h-3.5 w-3.5" /> Reviews & Hours
                    </h4>

                    {showReviewBreakdown && (
                      <div className="grid grid-cols-5 gap-1.5 text-xs">
                        {([5, 4, 3, 2, 1] as const).map((s) => {
                          const key = (["fiveStar", "fourStar", "threeStar", "twoStar", "oneStar"] as const)[5 - s]
                          const count = biz.reviewsDistribution[key]
                          const pct = biz.reviewsCount > 0 ? (count / biz.reviewsCount) * 100 : 0
                          return (
                            <div key={s} className="flex flex-col items-center gap-0.5">
                              <span className="text-muted-foreground">{s}{"*"}</span>
                              <div className="flex h-14 w-full items-end overflow-hidden rounded-sm bg-muted/50">
                                <div className="w-full rounded-sm bg-amber-400/60 transition-all" style={{ height: `${Math.max(pct, 2)}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{count.toLocaleString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {showOpeningHours && (
                      <>
                        <h4 className="flex items-center gap-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Hours
                        </h4>
                        <div className="space-y-0.5 text-xs">
                          {biz.openingHours.slice(0, 7).map((oh, index) => (
                            <div key={`${oh.day}-${index}`} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">{oh.day.slice(0, 3) || "--"}</span>
                              <span className={oh.hours === "Closed" ? "text-red-400" : "text-foreground"}>{oh.hours || "--"}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Phone & Web
                  </h4>
                  <div className="space-y-2 text-sm">
                    {biz.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{biz.phone}</p>}
                    <DetailItem label="Raw Phone" value={biz.phoneUnformatted} />
                    {biz.website && (
                      <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                        <Globe className="h-3 w-3" /> {biz.website}
                      </a>
                    )}
                    {biz.url && (
                      <a href={biz.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Google Maps Listing
                      </a>
                    )}
                    {biz.menu && (
                      <a href={biz.menu} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Menu / Food Link
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Share2 className="h-3.5 w-3.5" /> Outreach Links
                  </h4>
                  <div className="space-y-2 text-sm">
                    {biz.emails.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Mail className="mt-0.5 h-3 w-3 text-muted-foreground" />
                        <div className="space-y-0.5">{biz.emails.map((email, index) => <p key={`${email}-${index}`}>{email}</p>)}</div>
                      </div>
                    )}
                    {biz.socialMedia.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {biz.socialMedia.map((sm, index) => (
                          <a key={`${sm.url}-${index}`} href={sm.url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="secondary" className="cursor-pointer text-[10px] transition-colors hover:bg-primary/20 hover:text-primary">{sm.platform}</Badge>
                          </a>
                        ))}
                      </div>
                    )}
                    {biz.reservationLinks.length > 0 && (
                      <div className="space-y-1">
                        {biz.reservationLinks.map((link, index) => (
                          <a key={`reservation-${index}`} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Reserve #{index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    {biz.orderLinks.length > 0 && (
                      <div className="space-y-1">
                        {biz.orderLinks.map((link, index) => (
                          <a key={`order-${index}`} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Order Link #{index + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {biz.emails.length === 0 && biz.socialMedia.length === 0 && biz.reservationLinks.length === 0 && biz.orderLinks.length === 0 && !biz.phone && !biz.website && !biz.url && !biz.menu && (
                      <p className="text-muted-foreground">No contact channels available</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" /> Identifiers
                  </h4>
                  <p><span className="text-muted-foreground">Place ID:</span> <span className="font-mono text-xs">{biz.placeId || "--"}</span></p>
                  <p><span className="text-muted-foreground">CID:</span> <span className="font-mono text-xs">{biz.cid || "--"}</span></p>
                  <p><span className="text-muted-foreground">FID:</span> <span className="font-mono text-xs">{biz.fid || "--"}</span></p>
                  <p><span className="text-muted-foreground">KGMID:</span> <span className="font-mono text-xs">{biz.kgmid || "--"}</span></p>
                  <DetailItem label="Search String" value={biz.searchString} />
                  {biz.searchPageUrl && (
                    <a href={biz.searchPageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Search Page URL
                    </a>
                  )}
                  {biz.imageUrl && (
                    <a href={biz.imageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline break-all">
                      <ExternalLink className="h-3 w-3 shrink-0" /> Image URL
                    </a>
                  )}
                  <DetailItem label="Images Count" value={typeof biz.imagesCount === "number" ? biz.imagesCount.toString() : null} />
                </div>

                <div className="space-y-3 text-sm">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Share2 className="h-3.5 w-3.5" /> Extra Metadata
                  </h4>

                  {biz.imageCategories && biz.imageCategories.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Image Categories</p>
                      <div className="flex flex-wrap gap-1">{biz.imageCategories.map((tag, index) => <Badge key={`img-cat-${index}`} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>
                    </div>
                  )}

                  {biz.placesTags && biz.placesTags.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Places Tags</p>
                      <div className="flex flex-wrap gap-1">{biz.placesTags.map((tag, index) => <Badge key={`places-tag-${index}`} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>
                    </div>
                  )}

                  {biz.reviewsTags && biz.reviewsTags.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Reviews Tags</p>
                      <div className="flex flex-wrap gap-1">{biz.reviewsTags.map((tag, index) => <Badge key={`reviews-tag-${index}`} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>
                    </div>
                  )}

                  {biz.peopleAlsoSearch && biz.peopleAlsoSearch.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">People Also Search</p>
                      <div className="space-y-0.5 text-xs">{biz.peopleAlsoSearch.map((item, index) => <p key={`also-${index}`}>{item}</p>)}</div>
                    </div>
                  )}

                  {Object.keys(biz.additionalInfo).length > 0 && (
                    <div className="space-y-1 pt-1 text-xs">
                      {Object.entries(biz.additionalInfo).map(([key, vals]) => (
                        <p key={key}><span className="text-muted-foreground">{key}:</span> {vals.join(", ")}</p>
                      ))}
                    </div>
                  )}

                  {biz.gasPrices && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Gas Prices</p>
                      <pre className="overflow-x-auto rounded-md border border-border/40 bg-muted/30 p-2 text-[10px] leading-relaxed text-muted-foreground">
                        {JSON.stringify(biz.gasPrices, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!biz.gasPrices && Object.keys(biz.additionalInfo).length === 0 && (!biz.imageCategories || biz.imageCategories.length === 0) && (!biz.placesTags || biz.placesTags.length === 0) && (!biz.reviewsTags || biz.reviewsTags.length === 0) && (!biz.peopleAlsoSearch || biz.peopleAlsoSearch.length === 0) && (
                    <p className="text-muted-foreground">No additional metadata available</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function DataTable({ results, page, pageSize, onPageChange }: DataTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const totalPages = Math.ceil(results.length / pageSize)
  const paginatedData = results.slice((page - 1) * pageSize, page * pageSize)

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-8" />
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviews</TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Address</TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Phone</TableHead>
              <TableHead className="hidden text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Price</TableHead>
              <TableHead className="hidden text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Status</TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((biz) => {
              const expanded = expandedRows.has(biz.id)
              return (
                <Fragment key={biz.id}>{/* row pair */}
                  <TableRow
                    key={biz.id}
                    className="cursor-pointer border-border/30 transition-colors hover:bg-muted/40"
                    onClick={() => toggleRow(biz.id)}
                  >
                    <TableCell className="w-8 px-2">
                      {expanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{biz.title}</span>
                        {biz.website && (
                          <a
                            href={biz.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="h-3 w-3" />
                            {biz.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{biz.categoryName}</span></TableCell>
                    <TableCell className="text-center"><RatingStars score={biz.totalScore} /></TableCell>
                    <TableCell className="text-center font-mono text-sm text-muted-foreground">{biz.reviewsCount.toLocaleString()}</TableCell>
                    <TableCell className="hidden max-w-[200px] lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate text-xs text-muted-foreground">{biz.address}</span>
                        <span className="text-[11px] text-muted-foreground/60">{biz.neighborhood}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {biz.phone ? (
                        <span className="font-mono text-xs text-muted-foreground">{biz.phone}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">--</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-center sm:table-cell">
                      <span className="text-xs font-medium text-muted-foreground">{biz.price || "--"}</span>
                    </TableCell>
                    <TableCell className="hidden text-center md:table-cell">
                      <StatusBadge closed={biz.permanentlyClosed} tempClosed={biz.temporarilyClosed} />
                    </TableCell>
                    <TableCell className="text-center"><LeadBadge score={biz.leadScore} /></TableCell>
                  </TableRow>
                  {expanded && <ExpandedRow biz={biz} />}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}--{Math.min(page * pageSize, results.length)} of {results.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="rounded-lg bg-transparent" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => onPageChange(p)}>
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="rounded-lg bg-transparent" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
