import { describe, it, expect } from 'vitest'
import { listingKeys, customerKeys, dealKeys, transactionKeys } from '@landx/data'

describe('listingKeys', () => {
  it('all is the root listings tuple', () => {
    expect(listingKeys.all).toEqual(['listings'])
  })

  it('lists() extends all with "list"', () => {
    expect(listingKeys.lists()).toEqual(['listings', 'list'])
  })

  it('list(filters) embeds the filter object', () => {
    const key = listingKeys.list({ status: 'Aktif' })
    expect(key[0]).toBe('listings')
    expect(key[1]).toBe('list')
    expect(key[2]).toEqual({ status: 'Aktif' })
  })

  it('list() defaults to an empty filter object', () => {
    expect(listingKeys.list()).toEqual(['listings', 'list', {}])
  })

  it('detail(id) yields a stable three-segment key', () => {
    expect(listingKeys.detail('28.AY.0142')).toEqual([
      'listings',
      'detail',
      '28.AY.0142',
    ])
  })

  it('two identical inputs produce structurally equal keys', () => {
    const a = listingKeys.list({ status: 'Aktif', type: 'Zeytinlik' })
    const b = listingKeys.list({ status: 'Aktif', type: 'Zeytinlik' })
    expect(a).toEqual(b)
  })
})

describe('customerKeys', () => {
  it('detail(id) is ["customers","detail",id]', () => {
    expect(customerKeys.detail('c-1')).toEqual(['customers', 'detail', 'c-1'])
  })

  it('list(filters) embeds segment filter', () => {
    expect(customerKeys.list({ segment: 'Sıcak' })).toEqual([
      'customers',
      'list',
      { segment: 'Sıcak' },
    ])
  })
})

describe('dealKeys', () => {
  it('byStage(stage) is ["deals","by-stage",stage]', () => {
    expect(dealKeys.byStage('Görüşme')).toEqual(['deals', 'by-stage', 'Görüşme'])
  })

  it('funnel() is stable', () => {
    expect(dealKeys.funnel()).toEqual(['deals', 'funnel'])
  })
})

describe('transactionKeys', () => {
  it('cashflow() is ["transactions","cashflow"]', () => {
    expect(transactionKeys.cashflow()).toEqual(['transactions', 'cashflow'])
  })
})
