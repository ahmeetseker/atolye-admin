import type { AiAnswer } from './types'

const LOCATION_KEYWORDS = ['ayvalık', 'datça', 'cunda', 'söke', 'çanakkale', 'alaçatı', 'kuşadası']
const TYPE_KEYWORDS = ['zeytinlik', 'imarlı', 'tarla', 'villa', 'arsa']

function pickKeyword(q: string, list: string[]): string | null {
  const lower = q.toLowerCase()
  for (const k of list) {
    if (lower.includes(k)) return k
  }
  return null
}

export function answerQuery(query: string): AiAnswer {
  const location = pickKeyword(query, LOCATION_KEYWORDS)
  const type = pickKeyword(query, TYPE_KEYWORDS)

  if (location && type) {
    return {
      text: `${location[0].toUpperCase()}${location.slice(1)} bölgesindeki ${type} ilanları için 6 sonuç bulundu. En öne çıkan 3 ilanın görüntülenmesi şu hafta belirgin biçimde arttı.`,
      chart: {
        title: 'Bu hafta görüntülenme',
        data: [
          { label: 'Pzt', value: 28 },
          { label: 'Sal', value: 34, suffix: '↗' },
          { label: 'Çar', value: 41, suffix: '↗' },
          { label: 'Per', value: 38 },
          { label: 'Cum', value: 52, suffix: '↗' },
        ],
      },
    }
  }

  if (location) {
    return {
      text: `${location[0].toUpperCase()}${location.slice(1)} bölgesinde 11 aktif ilan var. Ortalama m² fiyatı geçen aya göre %4 yükseldi.`,
      chart: {
        title: 'Bölge dağılımı (ilan sayısı)',
        data: [
          { label: 'Sahil', value: 5 },
          { label: 'İç bölge', value: 4 },
          { label: 'Tepe', value: 2 },
        ],
      },
    }
  }

  if (type) {
    return {
      text: `${type[0].toUpperCase()}${type.slice(1)} kategorisinde 14 aktif ilanın değer ortalaması 4.8M ₺. Bu ay 3 yeni teklif geldi.`,
      chart: {
        title: 'Stok dağılımı',
        data: [
          { label: 'Aktif', value: 14 },
          { label: 'Pasif', value: 3 },
          { label: 'Taslak', value: 2 },
        ],
      },
    }
  }

  if (/sıcak|hot/i.test(query)) {
    return {
      text: 'Bu hafta sıcak müşterilerden 3 yeni talep geldi. Ortalama yanıt süresi 42 dakika — geçen haftaya göre 18 dakika daha hızlı.',
      chart: {
        title: 'Bu hafta sıcak temaslar',
        data: [
          { label: 'Pzt', value: 4 },
          { label: 'Sal', value: 7 },
          { label: 'Çar', value: 6 },
          { label: 'Per', value: 9 },
          { label: 'Cum', value: 12 },
        ],
      },
    }
  }

  if (/tahsilat|ödeme|payment/i.test(query)) {
    return {
      text: 'Bekleyen tahsilat: 6 işlem, toplam 2.4M ₺. 2 işlem 30+ gün geriden geliyor — hatırlatma gönderilmesi öneriliyor.',
      chart: {
        title: 'Yaşa göre bekleyen tahsilat',
        data: [
          { label: '< 7 gün', value: 2 },
          { label: '7-30', value: 2 },
          { label: '30+', value: 2 },
        ],
      },
    }
  }

  return {
    text: 'Şimdilik bu soruyu yanıtlayabilecek bir motor entegre değil. Önerilen aramalardan birini deneyebilir veya doğrudan sayfaları (İlanlar, Müşteriler, Finans) ziyaret edebilirsin.',
  }
}
