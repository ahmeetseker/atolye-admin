import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Handshake,
  HelpCircle,
  Layers,
  LifeBuoy,
  Mail,
  MessageSquare,
  Plug,
  Search,
  Sparkles,
  Users,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'

type Category = {
  key: string
  icon: typeof BookOpen
  title: string
  description: string
  articles: { title: string; href: string }[]
}

const CATEGORIES: Category[] = [
  {
    key: 'start',
    icon: BookOpen,
    title: 'Başlangıç',
    description: 'İlk haftada hızlı bir ofis kurulumu.',
    articles: [
      { title: 'Atölye nedir, hangi modüller var?', href: '#' },
      { title: 'Ekibi davet etme ve rolleri', href: '#' },
      { title: 'Domain ve marka kimliği', href: '#' },
      { title: 'Mobil dock & kısayollar', href: '#' },
    ],
  },
  {
    key: 'listings',
    icon: Layers,
    title: 'İlan yönetimi',
    description: 'Portföyü düzenli ve canlı tutmak.',
    articles: [
      { title: 'Yeni ilan adımları', href: '#' },
      { title: 'Toplu güncelleme ve durum geçişleri', href: '#' },
      { title: 'Harita ve parsel verisi', href: '#' },
      { title: 'Fotoğraf ve sunum dosyası', href: '#' },
    ],
  },
  {
    key: 'crm',
    icon: Users,
    title: 'Müşteri (CRM)',
    description: 'Defter, segment ve iletişim geçmişi.',
    articles: [
      { title: 'Müşteri profili anatomisi', href: '#' },
      { title: 'Otomatik segmentler nasıl çalışıyor?', href: '#' },
      { title: 'KVKK izinleri ve onay akışı', href: '#' },
      { title: 'İlan eşleştirme önerileri', href: '#' },
    ],
  },
  {
    key: 'sales',
    icon: Handshake,
    title: 'Satış pipeline',
    description: 'Aşamalar, teklifler, tapu.',
    articles: [
      { title: 'Pipeline aşamalarını özelleştir', href: '#' },
      { title: 'Teklif ve sözleşme şablonları', href: '#' },
      { title: 'Tapu randevusu takibi', href: '#' },
      { title: 'Komisyon paylaşımı', href: '#' },
    ],
  },
  {
    key: 'finance',
    icon: CreditCard,
    title: 'Finans',
    description: 'Tahsilat, gider, KDV, kapanış.',
    articles: [
      { title: 'Tahsilat takvimi ve hatırlatma', href: '#' },
      { title: 'KDV ve fatura kayıt akışı', href: '#' },
      { title: 'Komisyon hesaplaması', href: '#' },
      { title: 'Ay sonu kapanış kontrol listesi', href: '#' },
    ],
  },
  {
    key: 'integrations',
    icon: Plug,
    title: 'Entegrasyonlar',
    description: 'sahibinden.com, e-imza, takvim.',
    articles: [
      { title: 'sahibinden.com yayını nasıl açılır?', href: '#' },
      { title: 'Google Takvim senkronizasyonu', href: '#' },
      { title: 'E-imza sağlayıcısını bağla', href: '#' },
      { title: 'API anahtarları ve webhooks', href: '#' },
    ],
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Yeni ilan nasıl eklenir?',
    a: 'İlanlar sayfasının sağ üstündeki "Yeni ilan" düğmesi tıklanır. Açılan sihirbazda sırasıyla konum (parsel ada/pafta), imar durumu, fiyat, açıklama ve fotoğraflar girilir. Son adımda taslak veya doğrudan aktif yayın seçilir. Entegrasyon bağlıysa sahibinden.com yayınına da işaretlenebilir.',
  },
  {
    q: 'Müşteri segmenti nasıl belirleniyor?',
    a: 'Segmentler iki yoldan oluşur. (1) Otomatik: bütçe aralığı, ilgi alanı (zeytinlik / villa arsası / imarlı), son etkileşim ve teklif geçmişi kuralları sistem tarafından her gece güncellenir. (2) Manuel: bir müşteri kartının üstündeki etiket düğmesinden özel segment eklenebilir.',
  },
  {
    q: 'Komisyon hesaplaması nasıl çalışır?',
    a: 'Varsayılan komisyon oranı %2 + KDV olarak çalışır; ofis ayarlarından bu oran değiştirilebilir. Bir satış kapandığında sistem otomatik olarak komisyon tutarını hesaplar, satıcı/alıcı paylarına bölüp finans modülüne tahsilat olarak yazar.',
  },
  {
    q: 'İlan sahibinden.com’a otomatik yayınlanır mı?',
    a: 'Entegrasyon (Profil → Entegrasyonlar → sahibinden.com) kurulduktan sonra her aktif ilan saatte bir senkronize edilir. Hata durumunda Bildirimler sayfasında sistem bildirimi düşer. Manuel yayın yapmak isteyenler için ilan kartında "Yayını yenile" düğmesi mevcuttur.',
  },
  {
    q: 'Veriler nasıl yedekleniyor?',
    a: 'Tüm veriler her gece 03:00’te şifreli olarak yedeklenir ve 30 gün süreyle saklanır. Ayarlar → Yedekleme bölümünden istediğin an manuel JSON çıktısı alabilirsin. Veri taşıması (içe aktarım) için JSON/XLSX dosyaları eşleştirmeli sihirbaza yüklenir.',
  },
  {
    q: 'KVKK uyumluluğu nasıl sağlanıyor?',
    a: 'Atölye, açık rıza envanteri ile çalışır: her müşteri kaydında iletişim onayı (e-posta / SMS / WhatsApp) ayrı tutulur. Onay vermeyen kanaldan otomatik yollanma engellenir. VERBİS uyumlu dışa aktarım ve veri silme talepleri için tek tıklık akış mevcuttur.',
  },
  {
    q: 'Atölye asistanı (⌘K) ne yapar?',
    a: 'Komut paleti olarak çalışır. Müşteri, ilan veya işlem aramak, hızlı not düşmek, raporun ekran görüntüsünü almak, hatta "Bu hafta kapanan satışları özetle" gibi doğal dil sorularını yanıtlamak için kullanılır. Faz 6’dan sonra gerçek bir LLM ile zenginleştirilecek.',
  },
]

export function Help() {
  return (
    <PageShell
      eyebrow="MOD · YARDIM"
      title={
        <>
          Yardım <em className="font-serif italic font-light">merkezi</em>
        </>
      }
      description="Atölye'yi günlük işine bağlamak için ihtiyacın olan her şey. Sorular, kısa makaleler ve ekibimizle doğrudan iletişim."
      actions={
        <a
          href="mailto:destek@arsam.net"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <Mail className="h-3.5 w-3.5" />
          destek@arsam.net
        </a>
      }
    >
      <div className="space-y-8">
        <section className="overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Yardım arama
          </p>
          <h2 className="mt-2 font-serif text-3xl font-light tracking-tight sm:text-4xl">
            Ne <em className="font-serif italic font-light">arıyorsun?</em>
          </h2>
          <div className="mx-auto mt-5 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 text-left">
            <Search className="h-4 w-4 flex-none text-muted-foreground" />
            <input
              type="text"
              placeholder="örn. 'sahibinden bağlama', 'komisyon oranı', 'tapu randevusu'"
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              aria-label="Yardım ara"
            />
            <kbd className="hidden flex-none rounded-md border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              ↵
            </kbd>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            42 makale · 7 kategori · Türkçe
          </p>
        </section>

        <section>
          <header className="mb-4 flex items-baseline justify-between">
            <h3 className="font-serif text-xl font-medium tracking-tight">
              Kategoriler
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {CATEGORIES.length} başlık
            </span>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CATEGORIES.map((c) => (
              <CategoryCard key={c.key} category={c} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Destek
              </p>
              <h3 className="mt-1 font-serif text-2xl font-light tracking-tight">
                Hâlâ <em className="font-serif italic font-light">bulamadın</em> mı?
              </h3>
              <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
                Pazartesi–Cuma 09:00–18:00 arası canlı destek; dışında 24 saat
                içinde e-posta dönüşü.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background transition hover:bg-foreground/90"
                title="Faz 6'da aktif"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Canlı destek başlat
              </button>
              <a
                href="mailto:destek@arsam.net"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-[13px] font-medium transition hover:bg-foreground/[0.04]"
              >
                <Mail className="h-3.5 w-3.5" />
                destek@arsam.net
              </a>
            </div>
          </div>
        </section>

        <section>
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="font-serif text-xl font-medium tracking-tight">
              Sık sorulanlar
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {FAQS.length} soru
            </span>
          </header>
          <ul className="space-y-2">
            {FAQS.map((f, i) => (
              <li
                key={i}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <details className="group">
                  <summary
                    className={cn(
                      'flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition hover:bg-foreground/[0.02]',
                    )}
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 font-serif text-[15px] font-medium tracking-tight">
                      {f.q}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-[14px] text-muted-foreground transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="border-t border-border bg-background/30 px-5 py-4 text-[13.5px] leading-relaxed text-foreground/85">
                    {f.a}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-background/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold leading-tight">
                Sürüm notları
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                v0.1 MVP · Faz 13'te genel kullanıma açılacak.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-medium transition hover:bg-foreground/[0.04]"
            title="Yakında"
          >
            Tüm sürüm notları
            <ArrowRight className="h-3 w-3" />
          </button>
        </section>

        <p className="flex items-center justify-center gap-2 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <LifeBuoy className="h-3 w-3" />
          atölye yardım merkezi
        </p>
      </div>
    </PageShell>
  )
}

function CategoryCard({ category }: { category: Category }) {
  const { icon: Icon, title, description, articles } = category
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-foreground/30">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-base font-medium tracking-tight">
            {title}
          </h4>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {description}
          </p>
        </div>
      </header>
      <ul className="space-y-1">
        {articles.map((a, i) => (
          <li key={i}>
            <a
              href={a.href}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] text-foreground/85 transition hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <span className="truncate">{a.title}</span>
              <ArrowRight className="h-3 w-3 flex-none text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </article>
  )
}
