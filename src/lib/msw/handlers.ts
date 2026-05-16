import { http, HttpResponse } from 'msw'
import { LISTINGS, CUSTOMERS, type Listing, type Customer } from '@landx/data'

// Base URL for the future API — '/api/v1' under same origin (admin uses base /panel/, so /panel/api/v1).
// For MSW interception, we match on path regardless of origin.
const BASE = '/api/v1'

function applyListingFilters(rows: Listing[], url: URL): Listing[] {
  let out = rows
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  const search = url.searchParams.get('q')
  const priceMax = url.searchParams.get('priceMax')
  if (status && status !== 'Tümü') out = out.filter((l) => l.status === status)
  if (type && type !== 'Tümü') out = out.filter((l) => l.type === type)
  if (priceMax) out = out.filter((l) => l.price <= Number(priceMax))
  if (search) {
    const q = search.toLocaleLowerCase('tr-TR')
    out = out.filter(
      (l) =>
        l.id.toLocaleLowerCase('tr-TR').includes(q) ||
        l.title.toLocaleLowerCase('tr-TR').includes(q) ||
        l.district.toLocaleLowerCase('tr-TR').includes(q) ||
        l.tags.some((t) => t.toLocaleLowerCase('tr-TR').includes(q)),
    )
  }
  return out
}

export const handlers = [
  // GET /api/v1/listings?status=Aktif&type=Zeytinlik&q=cunda&priceMax=10000000
  http.get(`${BASE}/listings`, ({ request }) => {
    const url = new URL(request.url)
    const filtered = applyListingFilters(LISTINGS, url)
    return HttpResponse.json({ data: filtered, meta: { total: filtered.length } })
  }),

  // GET /api/v1/listings/:id
  http.get(`${BASE}/listings/:id`, ({ params }) => {
    const listing = LISTINGS.find((l) => l.id === params.id)
    if (!listing) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ data: listing })
  }),

  // POST /api/v1/listings — proof-of-concept create
  http.post(`${BASE}/listings`, async ({ request }) => {
    const body = (await request.json()) as Partial<Listing>
    if (!body.title || !body.city) {
      return HttpResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'title ve city zorunlu' } },
        { status: 400 },
      )
    }
    // Mock: don't actually persist — return as if saved with generated id
    const created: Listing = {
      id: `NEW.${Date.now()}`,
      title: body.title,
      city: body.city,
      district: body.district ?? '',
      type: body.type ?? 'İmarlı',
      size: body.size ?? 0,
      price: body.price ?? 0,
      status: 'Taslak',
      views: 0,
      weeklyTrend: [0, 0, 0, 0, 0, 0, 0],
      lastUpdate: new Date().toISOString(),
      tags: body.tags ?? [],
      // Wave F4.B.1 — Listing.lat/lng required; fall back to Turkey centroid
      // when the create body didn't include coordinates.
      lat: body.lat ?? 39.0,
      lng: body.lng ?? 35.0,
    }
    return HttpResponse.json({ data: created }, { status: 201 })
  }),

  // GET /api/v1/customers — basic version
  http.get(`${BASE}/customers`, ({ request }) => {
    const url = new URL(request.url)
    const segment = url.searchParams.get('segment')
    const search = url.searchParams.get('q')?.toLocaleLowerCase('tr-TR')
    let out: Customer[] = CUSTOMERS
    if (segment && segment !== 'Tümü') out = out.filter((c) => c.segment === segment)
    if (search) {
      out = out.filter(
        (c) =>
          c.id.toLocaleLowerCase('tr-TR').includes(search) ||
          c.name.toLocaleLowerCase('tr-TR').includes(search),
      )
    }
    return HttpResponse.json({ data: out, meta: { total: out.length } })
  }),

  // GET /api/v1/customers/:id
  http.get(`${BASE}/customers/:id`, ({ params }) => {
    const customer = CUSTOMERS.find((c) => c.id === params.id)
    if (!customer) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ data: customer })
  }),
]
