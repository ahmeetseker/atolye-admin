import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { initSentry, captureException } from '@landx/ui/lib'
import { ErrorBoundary } from '@landx/ui/feedback'
import './index.css'
import { queryClient } from '@landx/data'
import { RootLayout } from '@/routes/root'
import { setupMockServiceWorker } from '@/lib/msw/setup'
import { AuthProvider } from '@/auth/AuthProvider'

// Wave F25.A — Sentry init. DSN comes from VITE_SENTRY_DSN; in dev / CI /
// preview the helper falls back to console.error so call sites stay uniform.
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? null,
  environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
  release: 'f25',
})

// Boot MSW first if enabled (no-op in production / when flag off)
await setupMockServiceWorker()

const Home = lazy(() => import('@/routes/home').then((m) => ({ default: m.Home })))
const Listings = lazy(() => import('@/routes/listings').then((m) => ({ default: m.Listings })))
const ListingNew = lazy(() => import('@/routes/listing-new').then((m) => ({ default: m.ListingNew })))
const ListingsImport = lazy(() => import('@/routes/listings-import').then((m) => ({ default: m.ListingsImport })))
const CustomerNew = lazy(() => import('@/routes/customer-new').then((m) => ({ default: m.CustomerNew })))
const CustomersImport = lazy(() => import('@/routes/customers-import').then((m) => ({ default: m.CustomersImport })))
const Customers = lazy(() => import('@/routes/customers').then((m) => ({ default: m.Customers })))
const Sales = lazy(() => import('@/routes/sales').then((m) => ({ default: m.Sales })))
const Finance = lazy(() => import('@/routes/finance').then((m) => ({ default: m.Finance })))
const FinanceSubscription = lazy(() =>
  import('@/routes/finance-subscription').then((m) => ({ default: m.FinanceSubscription })),
)
const FinanceInvoices = lazy(() =>
  import('@/routes/finance-invoices').then((m) => ({ default: m.FinanceInvoices })),
)
const FinanceBillingSettings = lazy(() =>
  import('@/routes/finance-billing-settings').then((m) => ({ default: m.FinanceBillingSettings })),
)
const Reports = lazy(() => import('@/routes/reports').then((m) => ({ default: m.Reports })))
const Calendar = lazy(() => import('@/routes/calendar').then((m) => ({ default: m.Calendar })))
const Messages = lazy(() => import('@/routes/messages').then((m) => ({ default: m.Messages })))
const Search = lazy(() => import('@/routes/search').then((m) => ({ default: m.Search })))
const Profile = lazy(() => import('@/routes/profile').then((m) => ({ default: m.Profile })))
const Settings = lazy(() => import('@/routes/settings').then((m) => ({ default: m.Settings })))
const Help = lazy(() => import('@/routes/help').then((m) => ({ default: m.Help })))
const Notifications = lazy(() => import('@/routes/notifications').then((m) => ({ default: m.Notifications })))
const Login = lazy(() => import('@/routes/login').then((m) => ({ default: m.Login })))
const Offline = lazy(() => import('@/routes/offline').then((m) => ({ default: m.Offline })))
const Performance = lazy(() => import('@/routes/performance').then((m) => ({ default: m.Performance })))
const Offers = lazy(() => import('@/routes/offers').then((m) => ({ default: m.Offers })))
const SettingsVerification = lazy(() =>
  import('@/routes/settings-verification').then((m) => ({ default: m.SettingsVerification })),
)

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">yükleniyor</span>
      </div>
    </div>
  )
}

const lazyRoute = (Component: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
)

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: lazyRoute(Home) },
        { path: 'listings/import', element: lazyRoute(ListingsImport) },
        { path: 'listings/new', element: lazyRoute(ListingNew) },
        { path: 'listings', element: lazyRoute(Listings) },
        { path: 'customers/import', element: lazyRoute(CustomersImport) },
        { path: 'customers/new', element: lazyRoute(CustomerNew) },
        { path: 'customers', element: lazyRoute(Customers) },
        { path: 'sales', element: lazyRoute(Sales) },
        { path: 'finance', element: lazyRoute(Finance) },
        { path: 'finance/subscription', element: lazyRoute(FinanceSubscription) },
        { path: 'finance/invoices', element: lazyRoute(FinanceInvoices) },
        { path: 'finance/billing-settings', element: lazyRoute(FinanceBillingSettings) },
        { path: 'reports', element: lazyRoute(Reports) },
        { path: 'calendar', element: lazyRoute(Calendar) },
        { path: 'messages', element: lazyRoute(Messages) },
        { path: 'search', element: lazyRoute(Search) },
        { path: 'profile', element: lazyRoute(Profile) },
        { path: 'settings', element: lazyRoute(Settings) },
        { path: 'settings/verification', element: lazyRoute(SettingsVerification) },
        { path: 'help', element: lazyRoute(Help) },
        { path: 'notifications', element: lazyRoute(Notifications) },
        { path: 'login', element: lazyRoute(Login) },
        { path: 'giris', element: lazyRoute(Login) },
        { path: 'offline', element: lazyRoute(Offline) },
        { path: 'performance', element: lazyRoute(Performance) },
        { path: 'offers', element: lazyRoute(Offers) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary onError={(error) => captureException(error)}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          {ReactQueryDevtools && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
            </Suspense>
          )}
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
