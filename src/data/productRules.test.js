import { describe, expect, it } from 'vitest'
import { PRODUCTS } from './products.js'
import {
  generateProductId,
  getMargin,
  getStockLevel,
  normalizeProductValues,
  suggestSku,
  validateProduct,
} from './productRules.js'

const CATALOG = [
  { id: 'p01', name: 'Urban Backpack', sku: 'NX-BAG-01' },
  { id: 'p02', name: 'Travel Organizer', sku: 'NX-TRA-02' },
]

const VALID = {
  name: 'Field Satchel',
  sku: 'NX-BAG-03',
  category: 'Bags',
  price: '80',
  cost: '30',
  stock: '25',
  lowStockThreshold: '10',
  status: 'active',
}

describe('getStockLevel', () => {
  it('is out of stock at zero, low at or below the threshold, otherwise in stock', () => {
    expect(getStockLevel({ stock: 0, lowStockThreshold: 10 })).toBe('Out of stock')
    expect(getStockLevel({ stock: 1, lowStockThreshold: 10 })).toBe('Low stock')
    expect(getStockLevel({ stock: 10, lowStockThreshold: 10 })).toBe('Low stock')
    expect(getStockLevel({ stock: 11, lowStockThreshold: 10 })).toBe('In stock')
  })

  it('treats a zero threshold as "only out of stock is an alert"', () => {
    expect(getStockLevel({ stock: 1, lowStockThreshold: 0 })).toBe('In stock')
  })
})

describe('getMargin', () => {
  it('is (price - cost) / price', () => {
    expect(getMargin({ price: 100, cost: 40 })).toBeCloseTo(0.6)
    expect(getMargin({ price: 0, cost: 0 })).toBe(0)
  })
})

describe('generateProductId / suggestSku', () => {
  it('uses the next number above the highest existing id', () => {
    expect(generateProductId(CATALOG)).toBe('p03')
    expect(generateProductId([])).toBe('p01')
  })

  it('never issues an id at or below the highest one ever used', () => {
    expect(generateProductId(CATALOG, 5)).toBe('p06')
    expect(generateProductId(CATALOG, 1)).toBe('p03')
  })

  it('never reuses an id after a deletion in the middle', () => {
    expect(generateProductId([CATALOG[0], { id: 'p07', name: 'x', sku: 'x' }])).toBe('p08')
  })

  it('suggests an unused SKU in the catalog style', () => {
    expect(suggestSku('Bags', CATALOG)).toBe('NX-BAG-03')
    expect(suggestSku('Tech', CATALOG)).toBe('NX-TEC-03')
  })

  it('skips a suggestion that is already taken', () => {
    const taken = [...CATALOG, { id: 'p50', name: 'y', sku: 'NX-BAG-03' }]
    expect(suggestSku('Bags', taken)).not.toBe('NX-BAG-03')
  })
})

describe('validateProduct', () => {
  it('accepts a complete, valid product', () => {
    expect(validateProduct(VALID, CATALOG)).toEqual({})
  })

  it('requires every field', () => {
    const errors = validateProduct(
      { name: '', sku: '', category: '', price: '', cost: '', stock: '', lowStockThreshold: '', status: '' },
      CATALOG,
    )
    expect(Object.keys(errors).sort()).toEqual(
      ['category', 'cost', 'lowStockThreshold', 'name', 'price', 'sku', 'status', 'stock'].sort(),
    )
  })

  it('rejects duplicate names and SKUs, ignoring case and spacing', () => {
    expect(validateProduct({ ...VALID, name: '  urban backpack ' }, CATALOG).name).toMatch(/already exists/)
    expect(validateProduct({ ...VALID, sku: 'nx-bag-01' }, CATALOG).sku).toMatch(/already in use/)
  })

  it("lets a product keep its own name and SKU when editing", () => {
    expect(validateProduct({ ...VALID, name: 'Urban Backpack', sku: 'NX-BAG-01' }, CATALOG, 'p01')).toEqual({})
  })

  it('rejects malformed SKUs', () => {
    expect(validateProduct({ ...VALID, sku: 'no spaces!' }, CATALOG).sku).toMatch(/letters, numbers and dashes/i)
  })

  it('rejects a non-positive price and an absurd one', () => {
    expect(validateProduct({ ...VALID, price: '0' }, CATALOG).price).toMatch(/greater than/)
    expect(validateProduct({ ...VALID, price: '-5' }, CATALOG).price).toMatch(/greater than/)
    expect(validateProduct({ ...VALID, price: '999999' }, CATALOG).price).toMatch(/too high/)
  })

  it('rejects a negative cost and a cost above the price', () => {
    expect(validateProduct({ ...VALID, cost: '-1' }, CATALOG).cost).toMatch(/negative/)
    expect(validateProduct({ ...VALID, price: '20', cost: '25' }, CATALOG).cost).toMatch(/higher than the price/)
    expect(validateProduct({ ...VALID, price: '20', cost: '20' }, CATALOG).cost).toBeUndefined()
  })

  it('requires whole, non-negative stock and threshold', () => {
    expect(validateProduct({ ...VALID, stock: '1.5' }, CATALOG).stock).toMatch(/whole number/)
    expect(validateProduct({ ...VALID, stock: '-1' }, CATALOG).stock).toMatch(/whole number/)
    expect(validateProduct({ ...VALID, lowStockThreshold: '2.2' }, CATALOG).lowStockThreshold).toMatch(/whole number/)
    expect(validateProduct({ ...VALID, stock: '0' }, CATALOG).stock).toBeUndefined()
  })

  it('rejects an unknown category or status', () => {
    expect(validateProduct({ ...VALID, category: 'Furniture' }, CATALOG).category).toBeDefined()
    expect(validateProduct({ ...VALID, status: 'archived' }, CATALOG).status).toBeDefined()
  })
})

describe('normalizeProductValues', () => {
  it('trims, upper-cases the SKU, and converts numbers', () => {
    expect(normalizeProductValues({ ...VALID, name: '  Field Satchel ', sku: ' nx-bag-03 ', price: '79.999', stock: '25' })).toEqual({
      name: 'Field Satchel',
      sku: 'NX-BAG-03',
      category: 'Bags',
      price: 80,
      cost: 30,
      stock: 25,
      lowStockThreshold: 10,
      status: 'active',
    })
  })
})

describe('seeded catalog', () => {
  it('passes its own validation rules', () => {
    PRODUCTS.forEach((product) => {
      const values = Object.fromEntries(Object.entries(product).map(([key, value]) => [key, String(value)]))
      expect(validateProduct(values, PRODUCTS, product.id), product.name).toEqual({})
    })
  })

  it('has unique ids, names and SKUs', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((p) => p.name.toLowerCase())).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((p) => p.sku)).size).toBe(PRODUCTS.length)
  })
})
