import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { NuvemshopProtocolError, NuvemshopValidationError } from '@/modules/nuvemshop/server/errors'
import { readDecimalId, readOrderNumber } from '@/modules/nuvemshop/server/schemas/ids'
import { reviveLosslessInteger } from '@/modules/nuvemshop/server/schemas/lossless-json'
import {
  parseAddressProjection,
  parseCallerDecimalId,
  parseCategory,
  parseCorrelationId,
  parseInvoiceListValue,
  parseOrder,
  parseProduct,
} from '@/modules/nuvemshop/server/schemas'

import {
  ABOVE_INT32_ID,
  ABOVE_INT64_ID,
  CORRELATION_ID,
  CREATED_AT,
  FULFILLMENT_A,
  FULFILLMENT_B,
  HUGE_ID,
  INVOICE_KEY,
  INVOICE_LINK,
  OFFSET_CREATED_AT,
  THUMB_A,
  THUMB_B,
  TRACKING_EVENT_ID,
  UPDATED_AT,
  categoryRaw,
  orderRaw,
  productRaw,
} from './fixtures/schemas'

const moduleRoot = path.resolve(process.cwd(), 'src/modules/nuvemshop')

function expectProtocol(run: () => unknown) {
  try {
    run()
    expect.fail('expected NuvemshopProtocolError')
  } catch (error) {
    expect(error).toBeInstanceOf(NuvemshopProtocolError)
    if (!(error instanceof NuvemshopProtocolError)) throw error
    expect(error.message).toBe('Nuvemshop response is incompatible.')
    expect(error.name).toBe('NuvemshopProtocolError')
    const encoded = JSON.stringify(error.toJSON())
    expect(encoded).not.toContain('@')
    expect(encoded).not.toContain('latitude')
    expect(encoded).not.toContain('Rua')
    expect(encoded).not.toContain(HUGE_ID)
    expect(encoded).not.toContain(INVOICE_KEY)
  }
}

function expectValidation(run: () => unknown) {
  try {
    run()
    expect.fail('expected NuvemshopValidationError')
  } catch (error) {
    expect(error).toBeInstanceOf(NuvemshopValidationError)
    if (!(error instanceof NuvemshopValidationError)) throw error
    expect(error.message).toBe('Nuvemshop input is invalid.')
    const encoded = JSON.stringify(error.toJSON())
    expect(encoded).not.toContain(HUGE_ID)
    expect(encoded).not.toContain('@')
  }
}

function withUnquotedId(raw: string, field: string, digits: string): string {
  const pattern = new RegExp(`"${field}":\\d+`)
  if (!pattern.test(raw)) throw new Error(`fixture has no numeric ${field}`)
  return raw.replace(pattern, `"${field}":${digits}`)
}

describe('NUV-07 identifier precision', () => {
  it('preserves ids above int32 and MAX_SAFE_INTEGER as exact decimal strings', () => {
    const raw = withUnquotedId(productRaw(), 'id', HUGE_ID).replace(
      '"product_id":1234',
      `"product_id":${ABOVE_INT32_ID}`,
    )
    expect(String(JSON.parse(raw).id)).not.toBe(HUGE_ID)
    expect(Number.isSafeInteger(JSON.parse(raw).id)).toBe(false)

    const product = parseProduct(raw)
    expect(product.id).toBe(HUGE_ID)
    expect(product.variants[0]?.productId).toBe(ABOVE_INT32_ID)
    expect(product.id).not.toBe(String(JSON.parse(raw).id))
  })

  it('rejects an unsafe caller number instead of recovering rounded digits', () => {
    const rounded = JSON.parse(withUnquotedId(productRaw(), 'id', HUGE_ID)).id as number
    expect(Number.isSafeInteger(rounded)).toBe(false)
    expect(String(rounded)).not.toBe(HUGE_ID)
    expectValidation(() => parseCallerDecimalId(rounded))
    expect(parseCallerDecimalId(HUGE_ID)).toBe(HUGE_ID)
    expect(parseCallerDecimalId(ABOVE_INT32_ID)).toBe(ABOVE_INT32_ID)
    expect(parseCallerDecimalId(42)).toBe('42')
  })

  it('rejects negative, zero, fractional and malformed ids', () => {
    for (const value of [
      '-1',
      '0',
      '1.5',
      '1e2',
      '01',
      '+1',
      ' 1',
      '',
      'abc',
      Number.NaN,
      1.5,
      -1,
      0,
    ]) {
      expectValidation(() => parseCallerDecimalId(value))
    }
    expectProtocol(() => parseProduct(productRaw({ id: -1 })))
    expectProtocol(() => parseProduct(productRaw({ id: '1.5' })))
    expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '0')))
  })

  it('keeps fulfillment ULIDs and correlation ids as validated strings', () => {
    expect(parseCorrelationId(CORRELATION_ID)).toBe(CORRELATION_ID)
    expectValidation(() => parseCorrelationId(JSON.parse(HUGE_ID)))
    expectValidation(() => parseCorrelationId(900))
    const order = parseOrder(
      orderRaw({
        fulfillment_orders: [{ id: FULFILLMENT_A, status: 'PACKED', tracking_info: null }],
      }),
      { fulfillmentCompleteness: 'confirmed' },
    )
    expect(order.fulfillments).toEqual({
      completeness: 'confirmed',
      items: [
        expect.objectContaining({
          id: FULFILLMENT_A,
          status: { completeness: 'confirmed', value: 'PACKED' },
          tracking: { completeness: 'confirmed', value: null },
          destination: { completeness: 'not_consulted' },
        }),
      ],
    })
    expectProtocol(() =>
      parseOrder(orderRaw({ fulfillment_orders: [{ id: 'not-a-ulid' }] }), {
        fulfillmentCompleteness: 'confirmed',
      }),
    )
    expectProtocol(() =>
      parseOrder(orderRaw({ fulfillment_orders: [{ id: '01BX5ZZKBKACTAV9WEVGEMMVRI' }] }), {
        fulfillmentCompleteness: 'confirmed',
      }),
    )
  })

  it('does not arithmetic-decode identifiers', () => {
    const sources = readdirSync(path.join(moduleRoot, 'server'), { recursive: true })
      .filter((entry) => String(entry).endsWith('.ts'))
      .map((entry) => readFileSync(path.join(moduleRoot, 'server', String(entry)), 'utf8'))
      .join('\n')
    expect(sources).not.toMatch(/\bparseInt\s*\(/)
    expect(sources).not.toMatch(/\bNumber\s*\(/)
    expect(sources).not.toMatch(/\bfetch\s*\(/)
  })
})

describe('NUV-07 product and variant', () => {
  it('keeps visibility, localized fields, aligned values and tags', () => {
    const product = parseProduct(productRaw())
    expect(product.visibility).toBe('visible')
    expect(product.name).toEqual({ pt: 'Peça sintética' })
    expect(product.handle).toEqual({ pt: 'peca-sintetica' })
    expect(product.description).toEqual({ pt: '<p>Descrição sintética</p>' })
    expect(product.attributes).toEqual([{ pt: 'Cor' }, { pt: 'Tamanho' }])
    expect(product.variants[0]?.values).toEqual([{ pt: 'Azul' }, { pt: 'M' }])
    expect(product.tags).toEqual(['tema', 'cor', 'tamanho'])
    expect(product.categoryIds).toEqual(['4567'])
    expect(product.images).toEqual([
      { id: '101', src: 'https://cdn.example.test/synthetic/peca.jpg' },
    ])
    expect(product.createdAt).toEqual({
      raw: CREATED_AT,
      offset: '+0000',
      instant: '2022-11-15T19:36:59.000Z',
    })
    expect(product.variants[0]?.regular).toBe('25.00')
    expect(product.variants[0]?.promotional).toBe('19.00')
    expect(product.variants[0]?.effective).toBe('19.00')
    expect(product).not.toHaveProperty('published')
    expect(product).not.toHaveProperty('seo_title')
    expect(product.variants[0]).not.toHaveProperty('stock')
    expect(product.variants[0]).not.toHaveProperty('stock_management')
    expect(product.variants[0]).not.toHaveProperty('inventory_levels')
    expect(JSON.stringify(product)).not.toContain('inventory_levels')
  })

  it('accepts visible, unlisted and hidden without collapsing to boolean', () => {
    expect(parseProduct(productRaw({ visibility: 'unlisted', published: false })).visibility).toBe(
      'unlisted',
    )
    expect(parseProduct(productRaw({ visibility: 'hidden', published: false })).visibility).toBe(
      'hidden',
    )
    expectProtocol(() => parseProduct(productRaw({ visibility: true })))
    expectProtocol(() => parseProduct(productRaw({ visibility: false })))
    expectProtocol(() => parseProduct(productRaw({ published: false, visibility: undefined })))
    expectProtocol(() => parseProduct(productRaw({ visibility: 'published' })))
    expectProtocol(() => parseProduct(productRaw({ visibility: 'hidden', published: true })))
  })

  it('rejects misaligned variant values and dropped-required tags shape', () => {
    expectProtocol(() =>
      parseProduct(
        productRaw({
          variants: [
            {
              id: 101,
              product_id: 1234,
              price: '25.00',
              promotional_price: null,
              values: [{ pt: 'Azul' }],
              created_at: CREATED_AT,
              updated_at: UPDATED_AT,
            },
          ],
        }),
      ),
    )
    expectProtocol(() => parseProduct(productRaw({ tags: 1 })))
    expectProtocol(() => parseProduct(productRaw({ attributes: [{ pt: 1 }] })))
  })

  it('keeps nullable prices and omits effective price when regular is null', () => {
    const contact = parseProduct(
      productRaw({
        variants: [
          {
            id: 101,
            product_id: 1234,
            price: null,
            promotional_price: '19.00',
            values: [{ pt: 'Azul' }, { pt: 'M' }],
            created_at: CREATED_AT,
            updated_at: UPDATED_AT,
          },
        ],
      }),
    )
    expect(contact.variants[0]?.regular).toBeNull()
    expect(contact.variants[0]?.promotional).toBe('19.00')
    expect(contact.variants[0]?.effective).toBeNull()

    const regularOnly = parseProduct(
      productRaw({
        variants: [
          {
            id: 101,
            product_id: 1234,
            price: '25.00',
            values: [{ pt: 'Azul' }, { pt: 'M' }],
            created_at: CREATED_AT,
            updated_at: UPDATED_AT,
          },
        ],
      }),
    )
    expect(regularOnly.variants[0]?.promotional).toBeNull()
    expect(regularOnly.variants[0]?.effective).toBe('25.00')
  })

  it('rejects malformed money and never uses float', () => {
    for (const price of [19.9, '10,00', '', '1e2', 'NaN', '-1.00', ' 10.00']) {
      expectProtocol(() =>
        parseProduct(
          productRaw({
            variants: [
              {
                id: 101,
                product_id: 1234,
                price,
                promotional_price: null,
                values: [{ pt: 'Azul' }, { pt: 'M' }],
                created_at: CREATED_AT,
                updated_at: UPDATED_AT,
              },
            ],
          }),
        ),
      )
    }
  })

  it('tolerates a missing description and rejects a malformed one', () => {
    const raw = JSON.parse(productRaw()) as { description?: unknown }
    delete raw.description
    expect(parseProduct(JSON.stringify(raw)).description).toBeNull()
    expectProtocol(() => parseProduct(productRaw({ description: 'texto' })))
  })
})

describe('NUV-07 category', () => {
  it('keeps the closed minimum, optional handle and parent', () => {
    const child = parseCategory(categoryRaw({ parent: 99, visibility: 'soft-hidden' }))
    expect(child).toEqual({
      id: '4567',
      name: { pt: 'Série sintética', es: 'Serie' },
      handle: { pt: 'serie-sintetica' },
      parentId: '99',
      visibility: 'soft-hidden',
    })
    const root = JSON.parse(categoryRaw()) as { handle?: unknown }
    delete root.handle
    expect(
      parseCategory(JSON.stringify({ ...root, parent: null, visibility: 'hidden' })),
    ).toMatchObject({
      parentId: null,
      handle: null,
      visibility: 'hidden',
    })
    expect(parseCategory(categoryRaw({ handle: null })).handle).toBeNull()
  })

  it('rejects invalid visibility and does not synthesize a handle', () => {
    expectProtocol(() => parseCategory(categoryRaw({ visibility: 'unlisted' })))
    expectProtocol(() => parseCategory(categoryRaw({ visibility: true })))
    expectProtocol(() => parseCategory(categoryRaw({ handle: 1 })))
    const withoutHandle = JSON.parse(categoryRaw()) as { handle?: unknown; name: { pt: string } }
    delete withoutHandle.handle
    expect(parseCategory(JSON.stringify(withoutHandle)).handle).toBeNull()
    expect(JSON.stringify(parseCategory(categoryRaw()))).not.toContain('texto curatorial')
    expect(JSON.stringify(parseCategory(categoryRaw()))).not.toContain('Apparel')
  })
})

describe('NUV-07 order canonical date and line items', () => {
  it('preserves created_at instant and +0000 offset', () => {
    const order = parseOrder(orderRaw())
    expect(order.id).toBe('871254203')
    expect(order.number).toBe('306')
    expect(order.id).not.toBe(order.number)
    expect(order.createdAt).toEqual({
      raw: CREATED_AT,
      offset: '+0000',
      instant: '2022-11-15T19:36:59.000Z',
    })
    expect(order.createdAt.raw).not.toBe(UPDATED_AT)
    const shifted = parseOrder(orderRaw({ created_at: OFFSET_CREATED_AT }))
    expect(shifted.createdAt).toEqual({
      raw: OFFSET_CREATED_AT,
      offset: '-03:00',
      instant: '2013-01-03T12:11:51.000Z',
    })
  })

  it('rejects missing, null, malformed and lossy created_at without substituting other timestamps', () => {
    const base = JSON.parse(orderRaw()) as Record<string, unknown>
    delete base.created_at
    expectProtocol(() => parseOrder(JSON.stringify(base)))
    expectProtocol(() => parseOrder(orderRaw({ created_at: null })))
    expectProtocol(() => parseOrder(orderRaw({ created_at: '2022-11-15' })))
    expectProtocol(() => parseOrder(orderRaw({ created_at: '2022-11-15T19:36:59' })))
    const kept = parseOrder(orderRaw({ created_at: UPDATED_AT, updated_at: CREATED_AT }))
    expect(kept.createdAt.raw).toBe(UPDATED_AT)
    expect(kept.createdAt.raw).not.toBe(CREATED_AT)
    const substituted = parseOrder(orderRaw())
    expect(substituted.createdAt.raw).toBe(CREATED_AT)
    expect(substituted.createdAt.raw).not.toBe(UPDATED_AT)
  })

  it('preserves each line-item thumbnail and explicit absence', () => {
    const raw = withUnquotedId(
      orderRaw({
        products: [
          {
            id: 1,
            product_id: 111,
            variant_id: 222,
            name: 'A',
            price: '10.00',
            quantity: 1,
            image: { src: THUMB_A, id: 9, alt: ['galeria'] },
          },
          {
            id: 2,
            product_id: 111,
            variant_id: 222,
            name: 'B',
            price: '10.00',
            quantity: 1,
            image: { src: THUMB_B, id: 10 },
          },
          {
            id: 3,
            product_id: 111,
            variant_id: 222,
            name: 'C',
            price: '10.00',
            quantity: 1,
          },
          {
            id: 4,
            product_id: 111,
            variant_id: 222,
            name: 'D',
            price: '10.00',
            quantity: 1,
            image: null,
          },
        ],
      }),
      'id',
      ABOVE_INT64_ID,
    ).replace('"products":[{"id":1', `"products":[{"id":${ABOVE_INT64_ID}`)
    const order = parseOrder(raw)
    expect(order.lineItems.map((item) => item.thumbnail)).toEqual([
      { availability: 'available', src: THUMB_A },
      { availability: 'available', src: THUMB_B },
      { availability: 'unavailable' },
      { availability: 'unavailable' },
    ])
    expect(order.lineItems.map((item) => item.id)).toEqual([ABOVE_INT64_ID, '2', '3', '4'])
    expect(new Set(order.lineItems.map((item) => item.productId)).size).toBe(1)
    expect(JSON.stringify(order.lineItems)).not.toContain('galeria')
    expect(JSON.stringify(order.lineItems[0])).not.toContain('"image"')
  })

  it('rejects a present image with a missing or malformed src', () => {
    expectProtocol(() =>
      parseOrder(
        orderRaw({
          products: [
            {
              id: 1,
              product_id: 111,
              variant_id: 222,
              name: 'A',
              price: '10.00',
              quantity: 1,
              image: {},
            },
          ],
        }),
      ),
    )
    expectProtocol(() =>
      parseOrder(
        orderRaw({
          products: [
            {
              id: 1,
              product_id: 111,
              variant_id: 222,
              name: 'A',
              price: '10.00',
              quantity: 1,
              image: { src: 'not-a-url' },
            },
          ],
        }),
      ),
    )
    expectProtocol(() =>
      parseOrder(
        orderRaw({
          products: [
            {
              id: 1,
              product_id: 111,
              variant_id: 222,
              name: 'A',
              price: '10.00',
              quantity: 1,
              image: { src: 'https://user:secret@cdn.example.test/a.jpg' },
            },
          ],
        }),
      ),
    )
  })

  it('accepts an absent or unusable contact email and a nullable payment summary', () => {
    expect(parseOrder(orderRaw()).contactEmail).toBe('buyer@example.test')
    const dropped = JSON.parse(orderRaw()) as { contact_email?: unknown }
    delete dropped.contact_email
    expect(parseOrder(JSON.stringify(dropped)).contactEmail).toBeNull()
    expect(parseOrder(orderRaw({ contact_email: null })).contactEmail).toBeNull()
    expect(parseOrder(orderRaw({ contact_email: 'not-an-email' })).contactEmail).toBeNull()
    expect(parseOrder(orderRaw({ paid_at: null })).payment.paidAt).toBeNull()
    expect(parseOrder(orderRaw()).payment).toMatchObject({
      status: 'pending',
      gateway: 'offline',
      gatewayName: 'Transferência sintética',
      method: 'custom',
      cardBrand: null,
      installments: 1,
    })
    expect(parseOrder(orderRaw())).not.toHaveProperty('gatewayLink')
    expect(JSON.stringify(parseOrder(orderRaw()).payment)).not.toContain('payments.example.test')
  })
})

describe('NUV-07 fulfillments', () => {
  it('distinguishes not consulted, incomplete summaries and confirmed absence', () => {
    expect(parseOrder(orderRaw()).fulfillments).toEqual({ completeness: 'not_consulted' })
    const partial = parseOrder(
      orderRaw({
        fulfillment_orders: [{ id: FULFILLMENT_A }],
      }),
    )
    expect(partial.fulfillments.completeness).toBe('incomplete')
    if (partial.fulfillments.completeness !== 'incomplete') throw new Error('incomplete')
    expect(partial.fulfillments.items).toHaveLength(1)
    expect(partial.fulfillments.items[0]?.statusHistory).toEqual({ completeness: 'not_consulted' })
    expect(partial.fulfillments.items[0]?.status).toEqual({ completeness: 'not_consulted' })
    expect(partial.fulfillments.items[0]?.tracking).toEqual({ completeness: 'not_consulted' })
    expect(partial.fulfillments.items[0]?.destination).toEqual({ completeness: 'not_consulted' })
    const absent = parseOrder(orderRaw({ fulfillments: [] }), {
      fulfillmentCompleteness: 'confirmed',
    })
    expect(absent.fulfillments).toEqual({ completeness: 'confirmed', items: [] })
  })

  it('keeps many shipments, nullable tracking, empty history and custom status', () => {
    const order = parseOrder(
      orderRaw({
        shipping_status: 'unshipped',
        shipping_tracking_number: 'LEGACY-ONLY',
        fulfillment_orders: [
          {
            id: FULFILLMENT_A,
            status: 'UNPACKED',
            tracking_info: { code: null, url: null },
            status_history: [],
            tracking_events: [],
            destination: null,
          },
          {
            id: FULFILLMENT_B,
            status: 'custom_in_transit',
            tracking_info: null,
            status_history: [
              {
                from_status: 'UNPACKED',
                to_status: 'custom_in_transit',
                happened_at: CREATED_AT,
              },
            ],
            tracking_events: [
              {
                id: TRACKING_EVENT_ID,
                status: 'dispatched',
                description: 'ignore me',
                geolocation: { latitude: 1, longitude: 2 },
                happened_at: CREATED_AT,
              },
            ],
          },
        ],
      }),
      { fulfillmentCompleteness: 'confirmed' },
    )
    if (order.fulfillments.completeness !== 'confirmed') throw new Error('confirmed')
    expect(order.fulfillments.items).toHaveLength(2)
    expect(order.fulfillments.items[0]?.id).toBe(FULFILLMENT_A)
    expect(order.fulfillments.items[0]?.tracking).toEqual({
      completeness: 'confirmed',
      value: { code: null, url: null },
    })
    expect(order.fulfillments.items[0]?.destination).toEqual({
      completeness: 'confirmed',
      value: null,
    })
    expect(order.fulfillments.items[0]?.statusHistory).toEqual({
      completeness: 'confirmed',
      items: [],
    })
    expect(order.fulfillments.items[1]?.status).toEqual({
      completeness: 'confirmed',
      value: 'custom_in_transit',
    })
    expect(order.fulfillments.items[1]?.tracking).toEqual({
      completeness: 'confirmed',
      value: null,
    })
    expect(order.fulfillments.items[1]?.destination).toEqual({ completeness: 'not_consulted' })
    expect(order.fulfillments.items[1]?.statusHistory).toMatchObject({
      completeness: 'confirmed',
      items: [
        {
          fromStatus: 'UNPACKED',
          toStatus: 'custom_in_transit',
          happenedAt: { raw: CREATED_AT, offset: '+0000', instant: '2022-11-15T19:36:59.000Z' },
        },
      ],
    })
    expect(JSON.stringify(order.fulfillments)).not.toContain('latitude')
    expect(JSON.stringify(order.fulfillments)).not.toContain('LEGACY-ONLY')
    expect(JSON.stringify(order)).not.toContain('LEGACY-ONLY')
  })

  it('does not treat a partial summary as complete history', () => {
    const order = parseOrder(
      orderRaw({
        fulfillment_orders: [
          {
            id: FULFILLMENT_A,
            status: 'PACKED',
            status_history: [
              { from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT },
            ],
            tracking_events: [],
          },
        ],
      }),
      { fulfillmentCompleteness: 'incomplete' },
    )
    if (order.fulfillments.completeness !== 'incomplete') throw new Error('incomplete')
    expect(order.fulfillments.items[0]?.statusHistory.completeness).toBe('incomplete')
    expect(order.fulfillments.items[0]?.trackingEvents.completeness).toBe('incomplete')
  })
})

describe('NUV-07-R1 nullable history and fulfillment completeness', () => {
  const happened = {
    raw: CREATED_AT,
    offset: '+0000',
    instant: '2022-11-15T19:36:59.000Z',
  }
  const shifted = {
    raw: OFFSET_CREATED_AT,
    offset: '-03:00',
    instant: '2013-01-03T12:11:51.000Z',
  }
  const legacy = {
    address: 'Rua Sintética',
    number: '10',
    floor: 'Apto 1',
    locality: 'Centro',
    city: 'Cidade',
    zipcode: '00000000',
    name: 'Destinatário Sintético',
    phone: '+5500000000000',
    province: 'São Paulo',
    country: 'BR',
  }

  function parseConfirmed(fulfillment: Record<string, unknown>) {
    return parseOrder(
      orderRaw({
        fulfillment_orders: [
          {
            id: FULFILLMENT_A,
            status: 'PACKED',
            tracking_info: null,
            status_history: [],
            tracking_events: [],
            ...fulfillment,
          },
        ],
      }),
      { fulfillmentCompleteness: 'confirmed' },
    )
  }

  function onlyShipment(order: ReturnType<typeof parseOrder>) {
    if (order.fulfillments.completeness !== 'confirmed') throw new Error('confirmed')
    const item = order.fulfillments.items[0]
    if (!item) throw new Error('shipment')
    return item
  }

  it('accepts a null to_status and keeps a null from_status', () => {
    const toNull = onlyShipment(
      parseConfirmed({
        status_history: [{ from_status: 'UNPACKED', to_status: null, happened_at: CREATED_AT }],
      }),
    )
    expect(toNull.statusHistory).toEqual({
      completeness: 'confirmed',
      items: [{ fromStatus: 'UNPACKED', toStatus: null, happenedAt: happened }],
    })
    const fromNull = onlyShipment(
      parseConfirmed({
        status_history: [{ from_status: null, to_status: 'PACKED', happened_at: CREATED_AT }],
      }),
    )
    expect(fromNull.statusHistory).toEqual({
      completeness: 'confirmed',
      items: [{ fromStatus: null, toStatus: 'PACKED', happenedAt: happened }],
    })
  })

  it('preserves a valid to_status string and rejects an object or number', () => {
    const kept = onlyShipment(
      parseConfirmed({
        status_history: [{ from_status: 'UNPACKED', to_status: 'PACKED', happened_at: CREATED_AT }],
      }),
    )
    expect(kept.statusHistory).toEqual({
      completeness: 'confirmed',
      items: [{ fromStatus: 'UNPACKED', toStatus: 'PACKED', happenedAt: happened }],
    })
    expectProtocol(() =>
      parseConfirmed({
        status_history: [
          { from_status: 'UNPACKED', to_status: { bad: true }, happened_at: CREATED_AT },
        ],
      }),
    )
    expectProtocol(() =>
      parseConfirmed({
        status_history: [{ from_status: 'UNPACKED', to_status: 4, happened_at: CREATED_AT }],
      }),
    )
  })

  it('preserves a null tracking happened_at and a valid offset without inventing time', () => {
    const nullable = onlyShipment(
      parseConfirmed({
        tracking_events: [
          {
            id: TRACKING_EVENT_ID,
            status: 'dispatched',
            description: 'ignore me',
            happened_at: null,
            created_at: UPDATED_AT,
            updated_at: UPDATED_AT,
          },
        ],
      }),
    )
    expect(nullable.trackingEvents).toEqual({
      completeness: 'confirmed',
      items: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happenedAt: null }],
    })
    const encoded = JSON.stringify(nullable.trackingEvents)
    expect(encoded).not.toContain(UPDATED_AT)
    expect(encoded).not.toContain(CREATED_AT)
    const shiftedEvent = onlyShipment(
      parseConfirmed({
        tracking_events: [
          { id: TRACKING_EVENT_ID, status: 'in_transit', happened_at: OFFSET_CREATED_AT },
        ],
      }),
    )
    expect(shiftedEvent.trackingEvents).toEqual({
      completeness: 'confirmed',
      items: [{ id: TRACKING_EVENT_ID, status: 'in_transit', happenedAt: shifted }],
    })
  })

  it('rejects a malformed or omitted tracking timestamp and a null status-history timestamp', () => {
    expectProtocol(() =>
      parseConfirmed({
        tracking_events: [
          { id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: 'yesterday' },
        ],
      }),
    )
    expectProtocol(() =>
      parseConfirmed({
        tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched' }],
      }),
    )
    expectProtocol(() =>
      parseConfirmed({
        status_history: [{ from_status: 'UNPACKED', to_status: 'PACKED', happened_at: null }],
      }),
    )
    expectProtocol(() =>
      parseConfirmed({
        status_history: [
          { from_status: 'UNPACKED', to_status: 'PACKED', happened_at: '2022-11-15' },
        ],
      }),
    )
  })

  it('keeps Order.created_at required when a history row is legitimately nullable', () => {
    const order = parseConfirmed({
      status_history: [{ from_status: null, to_status: null, happened_at: CREATED_AT }],
      tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }],
    })
    expect(order.createdAt).toEqual(happened)
    expect(order.createdAt.raw).not.toBe(UPDATED_AT)
    expectProtocol(() => parseOrder(orderRaw({ created_at: null })))
    const kept = parseOrder(orderRaw({ created_at: UPDATED_AT, updated_at: CREATED_AT }))
    expect(kept.createdAt.raw).toBe(UPDATED_AT)
    expect(JSON.stringify(onlyShipment(order))).not.toContain(UPDATED_AT)
  })

  it('does not confirm an empty fulfillment collection that was never present', () => {
    expect(parseOrder(orderRaw()).fulfillments).toEqual({ completeness: 'not_consulted' })
    expectProtocol(() => parseOrder(orderRaw(), { fulfillmentCompleteness: 'confirmed' }))
    expectProtocol(() => parseOrder(orderRaw(), { fulfillmentCompleteness: 'incomplete' }))
  })

  it('confirms an explicit empty collection and real shipments, and keeps summaries incomplete', () => {
    expect(
      parseOrder(orderRaw({ fulfillment_orders: [] }), { fulfillmentCompleteness: 'confirmed' })
        .fulfillments,
    ).toEqual({ completeness: 'confirmed', items: [] })
    expect(
      parseOrder(orderRaw({ fulfillments: [] }), { fulfillmentCompleteness: 'confirmed' })
        .fulfillments,
    ).toEqual({ completeness: 'confirmed', items: [] })

    const many = parseOrder(
      orderRaw({
        fulfillment_orders: [
          { id: FULFILLMENT_A, status: 'PACKED', tracking_info: null },
          { id: FULFILLMENT_B, status: 'DISPATCHED', tracking_info: null },
        ],
      }),
      { fulfillmentCompleteness: 'confirmed' },
    )
    if (many.fulfillments.completeness !== 'confirmed') throw new Error('confirmed')
    expect(many.fulfillments.items.map((item) => item.id)).toEqual([FULFILLMENT_A, FULFILLMENT_B])

    const summary = parseOrder(orderRaw({ fulfillment_orders: [{ id: FULFILLMENT_A }] }))
    expect(summary.fulfillments.completeness).toBe('incomplete')
    if (summary.fulfillments.completeness !== 'incomplete') throw new Error('incomplete')
    expect(summary.fulfillments.items[0]?.statusHistory).toEqual({ completeness: 'not_consulted' })

    const promoted = parseOrder(orderRaw({ fulfillment_orders: [{ id: FULFILLMENT_A }] }), {
      fulfillmentCompleteness: 'confirmed',
    })
    expect(promoted.fulfillments.completeness).toBe('incomplete')
    if (promoted.fulfillments.completeness !== 'incomplete') throw new Error('incomplete')
    expect(promoted.fulfillments.items).toHaveLength(1)
    expect(promoted.fulfillments.items[0]?.id).toBe(FULFILLMENT_A)
    expect(promoted.fulfillments.items[0]?.statusHistory.completeness).toBe('not_consulted')

    const asId = parseOrder(orderRaw({ fulfillment_orders: [FULFILLMENT_A] }), {
      fulfillmentCompleteness: 'confirmed',
    })
    expect(asId.fulfillments.completeness).toBe('incomplete')
    if (asId.fulfillments.completeness !== 'incomplete') throw new Error('incomplete')
    expect(asId.fulfillments.items[0]?.id).toBe(FULFILLMENT_A)
  })

  it('does not drop present shipments or infer absence from a legacy address', () => {
    expectProtocol(() =>
      parseOrder(
        orderRaw({
          fulfillment_orders: [{ id: FULFILLMENT_A, status: 'PACKED', tracking_info: null }],
        }),
        { fulfillmentCompleteness: 'not_consulted' },
      ),
    )
    const unread = parseOrder(orderRaw({ shipping_address: legacy }))
    expect(unread.fulfillments).toEqual({ completeness: 'not_consulted' })
    expect(unread.provisionalAddress?.provenance).toBe('order_legacy_provisional')
    expectProtocol(() =>
      parseOrder(orderRaw({ shipping_address: legacy }), { fulfillmentCompleteness: 'confirmed' }),
    )
    const confirmedEmpty = parseOrder(orderRaw({ shipping_address: legacy, fulfillments: [] }), {
      fulfillmentCompleteness: 'confirmed',
    })
    const withoutAddress = parseOrder(orderRaw({ fulfillments: [] }), {
      fulfillmentCompleteness: 'confirmed',
    })
    expect(confirmedEmpty.fulfillments).toEqual({ completeness: 'confirmed', items: [] })
    expect(withoutAddress.fulfillments).toEqual(confirmedEmpty.fulfillments)
    expect(confirmedEmpty.provisionalAddress).not.toBeNull()
    expect(withoutAddress.provisionalAddress).toBeNull()
  })

  it('does not read the Nuvemshop API while normalizing an order', () => {
    const calls: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = ((input: unknown) => {
      calls.push(String(input))
      throw new Error('unexpected fetch')
    }) as typeof fetch
    try {
      parseOrder(orderRaw())
      parseOrder(orderRaw({ fulfillment_orders: [] }), { fulfillmentCompleteness: 'confirmed' })
      parseConfirmed({
        status_history: [{ from_status: null, to_status: null, happened_at: CREATED_AT }],
        tracking_events: [{ id: TRACKING_EVENT_ID, status: 'dispatched', happened_at: null }],
      })
    } finally {
      globalThis.fetch = original
    }
    expect(calls).toEqual([])
  })
})

describe('NUV-07 address minimization and provenance', () => {
  const legacy = {
    address: 'Rua Sintética',
    number: '10',
    floor: 'Apto 1',
    locality: 'Centro',
    city: 'Cidade',
    zipcode: '00000000',
    name: 'Destinatário Sintético',
    phone: '+5500000000000',
    province: 'São Paulo',
    country: 'BR',
    customs: { note: 'x' },
    id: 0,
  }
  const destination = {
    street: 'Rua da Remessa',
    number: '20',
    floor: null,
    locality: 'Bairro',
    city: 'Outra',
    zipcode: '11111111',
    reference: 'perto',
    between_streets: 'A e B',
    province: { name: 'São Paulo', code: 'SP' },
    country: { name: 'Brasil', code: 'BR' },
    geolocation: { latitude: -23.5, longitude: -46.6 },
  }

  it('keeps a provisional order-level address without a fulfillment', () => {
    const order = parseOrder(orderRaw({ shipping_address: legacy, fulfillments: [] }), {
      fulfillmentCompleteness: 'confirmed',
    })
    expect(order.fulfillments).toEqual({ completeness: 'confirmed', items: [] })
    expect(order.provisionalAddress).toEqual({
      provenance: 'order_legacy_provisional',
      address: {
        recipientName: 'Destinatário Sintético',
        street: 'Rua Sintética',
        number: '10',
        floor: 'Apto 1',
        locality: 'Centro',
        city: 'Cidade',
        zipcode: '00000000',
        provinceName: 'São Paulo',
        provinceCode: null,
        countryName: null,
        countryCode: 'BR',
      },
    })
    expect(JSON.stringify(order.provisionalAddress)).not.toContain('phone')
    expect(JSON.stringify(order.provisionalAddress)).not.toContain('latitude')
  })

  it('accepts a missing provisional address and never copies it onto a shipment', () => {
    expect(parseOrder(orderRaw({ shipping_address: null })).provisionalAddress).toBeNull()
    const dropped = JSON.parse(orderRaw()) as { shipping_address?: unknown }
    delete dropped.shipping_address
    expect(parseOrder(JSON.stringify(dropped)).provisionalAddress).toBeNull()
    const order = parseOrder(
      orderRaw({
        shipping_address: legacy,
        fulfillment_orders: [
          { id: FULFILLMENT_A, status: 'PACKED', destination: null, recipient: { name: 'Outro' } },
          {
            id: FULFILLMENT_B,
            status: 'PACKED',
            destination,
            recipient: { name: 'Remessa', phone: '+5500000000001', identifier: '000' },
          },
        ],
      }),
      { fulfillmentCompleteness: 'confirmed' },
    )
    if (order.fulfillments.completeness !== 'confirmed') throw new Error('confirmed')
    expect(order.provisionalAddress?.provenance).toBe('order_legacy_provisional')
    expect(order.fulfillments.items[0]?.destination).toEqual({
      completeness: 'confirmed',
      value: {
        provenance: 'fulfillment',
        address: {
          recipientName: 'Outro',
          street: null,
          number: null,
          floor: null,
          locality: null,
          city: null,
          zipcode: null,
          provinceName: null,
          provinceCode: null,
          countryName: null,
          countryCode: null,
        },
      },
    })
    expect(order.fulfillments.items[1]?.destination).toEqual({
      completeness: 'confirmed',
      value: {
        provenance: 'fulfillment',
        address: {
          recipientName: 'Remessa',
          street: 'Rua da Remessa',
          number: '20',
          floor: null,
          locality: 'Bairro',
          city: 'Outra',
          zipcode: '11111111',
          provinceName: 'São Paulo',
          provinceCode: 'SP',
          countryName: 'Brasil',
          countryCode: 'BR',
        },
      },
    })
    const secondDestination = order.fulfillments.items[1]?.destination
    if (secondDestination?.completeness !== 'confirmed' || secondDestination.value === null) {
      throw new Error('destination')
    }
    expect(secondDestination.value.address.street).not.toBe('Rua Sintética')
    expect(JSON.stringify(order.fulfillments)).not.toContain('latitude')
    expect(JSON.stringify(order.fulfillments)).not.toContain('identifier')
  })

  it('rejects a malformed present address and a projection without provenance', () => {
    expectProtocol(() => parseOrder(orderRaw({ shipping_address: { address: 10 } })))
    expectProtocol(() =>
      parseOrder(
        orderRaw({
          fulfillment_orders: [
            {
              id: FULFILLMENT_A,
              destination: {
                street: { bad: true },
                province: { name: 'X', code: 'SP' },
                country: { name: 'Brasil', code: 'BR' },
              },
            },
          ],
        }),
        { fulfillmentCompleteness: 'confirmed' },
      ),
    )
    expectProtocol(() => parseAddressProjection({ address: { street: 'Rua' } }))
    expectProtocol(() =>
      parseAddressProjection({
        provenance: 'fulfillment',
        address: { street: 'Rua', latitude: 1 },
      }),
    )
    expect(
      parseAddressProjection({
        provenance: 'order_legacy_provisional',
        address: { street: 'Rua Sintética' },
      }).provenance,
    ).toBe('order_legacy_provisional')
  })
})

describe('NUV-07 invoice references', () => {
  const list = JSON.stringify([
    { key: INVOICE_KEY, link: INVOICE_LINK, fulfillment_order_id: FULFILLMENT_B },
    { key: `${INVOICE_KEY.slice(0, -1)}2`, link: 'https://files.example.test/synthetic/nfe/2' },
  ])

  it('preserves zero-to-many refs and an exact optional fulfillment id', () => {
    const unread = parseOrder(orderRaw())
    expect(unread.invoices).toEqual({ completeness: 'not_consulted' })
    const empty = parseOrder(orderRaw(), { invoiceCompleteness: 'confirmed', invoiceValue: null })
    expect(empty.invoices).toEqual({ completeness: 'confirmed', items: [] })
    const parsed = parseInvoiceListValue(list)
    expect(parsed).toEqual([
      { key: INVOICE_KEY, link: INVOICE_LINK, fulfillmentOrderId: FULFILLMENT_B },
      {
        key: `${INVOICE_KEY.slice(0, -1)}2`,
        link: 'https://files.example.test/synthetic/nfe/2',
        fulfillmentOrderId: null,
      },
    ])
    const order = parseOrder(
      orderRaw({
        fulfillment_orders: [
          { id: FULFILLMENT_A, status: 'PACKED' },
          { id: FULFILLMENT_B, status: 'PACKED' },
        ],
      }),
      {
        fulfillmentCompleteness: 'confirmed',
        invoiceCompleteness: 'confirmed',
        invoiceValue: list,
      },
    )
    if (order.invoices.completeness !== 'confirmed') throw new Error('invoices')
    expect(order.invoices.items[0]?.fulfillmentOrderId).toBe(FULFILLMENT_B)
    expect(order.invoices.items[0]?.fulfillmentOrderId).not.toBe(FULFILLMENT_A)
    expect(order.invoices.items[0]?.link).toBe(INVOICE_LINK)
  })

  it('rejects malformed fiscal values instead of coercing them to an empty list', () => {
    expectProtocol(() => parseInvoiceListValue('{'))
    expectProtocol(() => parseInvoiceListValue('null'))
    expectProtocol(() => parseInvoiceListValue('{"key":"1"}'))
    expectProtocol(() => parseInvoiceListValue(JSON.stringify([{ key: INVOICE_KEY }])))
    expectProtocol(() =>
      parseInvoiceListValue(JSON.stringify([{ key: INVOICE_KEY, link: 'javascript:alert(1)' }])),
    )
    expectProtocol(() =>
      parseInvoiceListValue(
        JSON.stringify([{ key: INVOICE_KEY, link: 'https://user:secret@files.example.test/nfe' }]),
      ),
    )
    expectProtocol(() =>
      parseInvoiceListValue(JSON.stringify([{ key: INVOICE_KEY, link: '/nfe/1' }])),
    )
    expectProtocol(() =>
      parseOrder(orderRaw(), { invoiceCompleteness: 'confirmed', invoiceValue: '{' }),
    )
  })
})

describe('NUV-07 privacy and server-only schemas', () => {
  it('drops customer and extra PII from the normalized order', () => {
    const order = parseOrder(orderRaw())
    const encoded = JSON.stringify(order)
    expect(encoded).not.toContain('synthetic-token-not-exported')
    expect(encoded).not.toContain('contact_phone')
    expect(encoded).not.toContain('+5500000000000')
    expect(encoded).not.toContain('00000000000')
    expect(encoded).not.toContain('Pessoa Sintética')
    expect(order).not.toHaveProperty('customer')
    expect(encoded).toContain('buyer@example.test')
  })

  it('marks every nuvemshop source file as server-only', () => {
    const files = readdirSync(moduleRoot, { recursive: true, withFileTypes: true }).filter(
      (entry) => entry.isFile() && entry.name.endsWith('.ts'),
    )
    expect(files.length).toBeGreaterThan(2)
    for (const entry of files) {
      const filename = path.join(entry.parentPath, entry.name)
      const source = readFileSync(filename, 'utf8')
      expect(source.startsWith("import 'server-only'"), filename).toBe(true)
      expect(source).not.toMatch(/\bCustomer\b/)
    }
  })
})

describe('NUV-07-R2 numeric token integrity', () => {
  const SAFE_BOUNDARY = '9007199254740991'
  const UNSAFE_EXACT = '9007199254740992'
  const UNSAFE_ROUNDED = HUGE_ID

  describe('6.1 legitimate ID precision', () => {
    it('preserves product id unquoted ABOVE_INT32_ID', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', ABOVE_INT32_ID))
      expect(product.id).toBe(ABOVE_INT32_ID)
    })

    it('preserves product id unquoted SAFE_BOUNDARY', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', SAFE_BOUNDARY))
      expect(product.id).toBe(SAFE_BOUNDARY)
    })

    it('preserves product id unquoted UNSAFE_EXACT', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', UNSAFE_EXACT))
      expect(product.id).toBe(UNSAFE_EXACT)
    })

    it('preserves product id unquoted UNSAFE_ROUNDED (HUGE_ID)', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', UNSAFE_ROUNDED))
      expect(product.id).toBe(UNSAFE_ROUNDED)
    })

    it('preserves product id unquoted ABOVE_INT64_ID', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', ABOVE_INT64_ID))
      expect(product.id).toBe(ABOVE_INT64_ID)
    })

    it('preserves product id as a JSON string of HUGE_ID', () => {
      const product = parseProduct(productRaw({ id: HUGE_ID }))
      expect(product.id).toBe(HUGE_ID)
    })

    it('preserves variant id, product_id, and nested category id as unquoted unsafe integers', () => {
      const raw = withUnquotedId(productRaw(), 'id', SAFE_BOUNDARY)
        .replace('"variants":[{"id":101', `"variants":[{"id":${UNSAFE_EXACT}`)
        .replace('"product_id":1234', `"product_id":${UNSAFE_ROUNDED}`)
        .replace('"categories":[{"id":4567', `"categories":[{"id":${ABOVE_INT64_ID}`)
      const product = parseProduct(raw)
      expect(product.id).toBe(SAFE_BOUNDARY)
      expect(product.variants[0]?.id).toBe(UNSAFE_EXACT)
      expect(product.variants[0]?.productId).toBe(UNSAFE_ROUNDED)
      expect(product.categoryIds).toEqual([ABOVE_INT64_ID])
    })

    it('preserves nested numeric category entries without object wrappers', () => {
      const raw = productRaw().replace(
        '"categories":[{"id":4567,"name":{"pt":"Série"},"description":{"pt":"não exportar"}}]',
        `"categories":[${UNSAFE_EXACT},${UNSAFE_ROUNDED}]`,
      )
      const product = parseProduct(raw)
      expect(product.categoryIds).toEqual([UNSAFE_EXACT, UNSAFE_ROUNDED])
    })

    it('preserves category id unquoted unsafe integer via parseCategory', () => {
      const category = parseCategory(withUnquotedId(categoryRaw(), 'id', UNSAFE_EXACT))
      expect(category.id).toBe(UNSAFE_EXACT)
    })

    it('preserves order id and line-item ids as unquoted unsafe integers', () => {
      const raw = withUnquotedId(orderRaw(), 'id', UNSAFE_EXACT)
        .replace('"products":[{"id":1069053829', `"products":[{"id":${UNSAFE_ROUNDED}`)
        .replace('"product_id":111', `"product_id":${ABOVE_INT64_ID}`)
        .replace('"variant_id":"426215948"', `"variant_id":${SAFE_BOUNDARY}`)
      const order = parseOrder(raw)
      expect(order.id).toBe(UNSAFE_EXACT)
      expect(order.lineItems[0]?.id).toBe(UNSAFE_ROUNDED)
      expect(order.lineItems[0]?.productId).toBe(ABOVE_INT64_ID)
      expect(order.lineItems[0]?.variantId).toBe(SAFE_BOUNDARY)
    })

    it('preserves order.number unquoted HUGE_ID as exact decimal', () => {
      const order = parseOrder(withUnquotedId(orderRaw(), 'number', HUGE_ID))
      expect(order.number).toBe(HUGE_ID)
    })

    it('rejects rounded unsafe numbers from JSON.parse on caller decimal ids', () => {
      const roundedHuge = JSON.parse(HUGE_ID) as number
      expect(String(roundedHuge)).not.toBe(HUGE_ID)
      expectValidation(() => parseCallerDecimalId(roundedHuge))
      const unsafeExactNum = Number(UNSAFE_EXACT)
      expect(Number.isSafeInteger(unsafeExactNum)).toBe(false)
      expectValidation(() => parseCallerDecimalId(unsafeExactNum))
      const roundedInt64 = JSON.parse(ABOVE_INT64_ID) as number
      expectValidation(() => parseCallerDecimalId(roundedInt64))
      expectValidation(() => parseCallerDecimalId(BigInt(HUGE_ID)))
    })

    it('stringifies normalized product with huge id without bigint markers', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', HUGE_ID))
      const encoded = JSON.stringify(product)
      expect(encoded).toContain(HUGE_ID)
      expect(encoded).not.toContain('bigint')
      expect(() => JSON.stringify(product)).not.toThrow()
    })

    it('stringifies normalized order with huge id without bigint markers', () => {
      const order = parseOrder(withUnquotedId(orderRaw(), 'id', HUGE_ID))
      const encoded = JSON.stringify(order)
      expect(encoded).toContain(HUGE_ID)
      expect(encoded).not.toContain('bigint')
      expect(() => JSON.stringify(order)).not.toThrow()
    })
  })

  describe('6.2 invalid provider types (expect protocol)', () => {
    it('rejects variant regular price as unquoted unsafe integer', () => {
      const raw = productRaw().replace('"price":"25.00"', `"price":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects variant promotional price as unquoted unsafe integer', () => {
      const raw = productRaw().replace(
        '"promotional_price":"19.00"',
        `"promotional_price":${UNSAFE_ROUNDED}`,
      )
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects product tags as unquoted unsafe integer', () => {
      const raw = productRaw().replace('"tags":"tema, cor, tamanho"', `"tags":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects localized product name pt as unquoted unsafe integer (RED: type-loss)', () => {
      const raw = productRaw().replace(
        '"name":{"pt":"Peça sintética"}',
        `"name":{"pt":${UNSAFE_ROUNDED}}`,
      )
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects localized handle pt as unquoted unsafe integer', () => {
      const raw = productRaw().replace(
        '"handle":{"pt":"peca-sintetica"}',
        `"handle":{"pt":${UNSAFE_ROUNDED}}`,
      )
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects localized attribute Cor pt as unquoted unsafe integer', () => {
      const raw = productRaw().replace(
        '"attributes":[{"pt":"Cor"}',
        `"attributes":[{"pt":${UNSAFE_ROUNDED}}`,
      )
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects order status as unquoted unsafe integer', () => {
      const raw = orderRaw().replace('"status":"open"', `"status":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw))
    })

    it('rejects fulfillment status as unquoted unsafe integer', () => {
      const raw = orderRaw({
        fulfillment_orders: [{ id: FULFILLMENT_A, status: 'PACKED', tracking_info: null }],
      }).replace('"status":"PACKED"', `"status":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw, { fulfillmentCompleteness: 'confirmed' }))
    })

    it('rejects invoice fiscal key as unquoted unsafe integer', () => {
      const raw = `[{"key":${UNSAFE_ROUNDED},"link":"${INVOICE_LINK}"}]`
      expectProtocol(() => parseInvoiceListValue(raw))
    })

    it('rejects line item name as unquoted unsafe integer', () => {
      const raw = orderRaw().replace('"name":"Peça A"', `"name":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw))
    })

    it('rejects line item price as unquoted unsafe integer', () => {
      const raw = orderRaw().replace('"price":"40.00"', `"price":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw))
    })

    it('rejects order total as unquoted unsafe integer', () => {
      const raw = orderRaw().replace('"total":"80.00"', `"total":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw))
    })

    it('rejects line item quantity as unquoted unsafe integer', () => {
      const raw = orderRaw().replace('"quantity":"1"', `"quantity":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw))
    })

    it('rejects legacy address street as unquoted unsafe integer', () => {
      const raw = orderRaw().replace(
        '"shipping_address":null',
        `"shipping_address":{"address":${UNSAFE_ROUNDED}}`,
      )
      expectProtocol(() => parseOrder(raw))
    })

    it('rejects a 26-digit numeric fulfillment id that would match a ULID string', () => {
      const digits = '90071992547409939007199254'
      const raw = orderRaw().replace(
        '"shipping_address":null',
        `"fulfillment_orders":[${digits}],"shipping_address":null`,
      )
      expectProtocol(() => parseOrder(raw, { fulfillmentCompleteness: 'confirmed' }))
    })

    it('rejects fulfillment tracking code as unquoted unsafe integer', () => {
      const raw = orderRaw({
        fulfillment_orders: [
          {
            id: FULFILLMENT_A,
            status: 'PACKED',
            tracking_info: { code: 'TRACK-1', url: null },
          },
        ],
      }).replace('"code":"TRACK-1"', `"code":${UNSAFE_ROUNDED}`)
      expectProtocol(() => parseOrder(raw, { fulfillmentCompleteness: 'confirmed' }))
    })

    it('preservation: ignored seo_title as unquoted unsafe integer still parses and drops field', () => {
      const raw = productRaw().replace(
        '"seo_title":"não exportar"',
        `"seo_title":${UNSAFE_ROUNDED}`,
      )
      const product = parseProduct(raw)
      expect(product).not.toHaveProperty('seo_title')
      expect(JSON.stringify(product)).not.toContain(UNSAFE_ROUNDED)
    })
  })

  describe('6.3 lexically invalid JSON (expect protocol, no repair)', () => {
    it('rejects product id with leading zero unsafe integer lexeme', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '09007199254740993')))
    })

    it('rejects product id with negative leading-zero unsafe lexeme', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '-09007199254740993')))
    })

    it('rejects trailing comma after unsafe integer id object', () => {
      expectProtocol(() => parseProduct('{"id":9007199254740993,}'))
    })

    it('rejects trailing garbage after closed id object', () => {
      expectProtocol(() => parseProduct('{"id":9007199254740993} trailing'))
    })

    it('rejects fractional unsafe integer used as id', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '9007199254740993.5')))
    })

    it('rejects incomplete exponent on unsafe integer id', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '9007199254740993e')))
    })

    it('rejects invalid escape in localized name string', () => {
      const raw = productRaw().replace('"name":{"pt":"Peça sintética"}', '"name":{"pt":"\\q"}')
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects unterminated string in product raw', () => {
      expectProtocol(() => parseProduct(productRaw().slice(0, -1)))
    })

    it('rejects truncated object with unsafe integer id', () => {
      expectProtocol(() => parseProduct('{"id":9007199254740993'))
    })

    it('rejects negative unsafe integer id (valid JSON, invalid id)', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', `-${UNSAFE_ROUNDED}`)))
    })

    it('rejects unsafe integer id with explicit .0 fraction', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '9007199254740993.0')))
    })

    it('rejects localized name pt with leading-zero unquoted unsafe lexeme (RED: syntax repair)', () => {
      const raw = productRaw().replace(
        '"name":{"pt":"Peça sintética"}',
        '"name":{"pt":09007199254740993}',
      )
      expectProtocol(() => parseProduct(raw))
    })
  })

  describe('6.4 legitimate strings (expect success)', () => {
    it('accepts variant regular price as quoted unsafe digit string', () => {
      const raw = productRaw().replace('"price":"25.00"', `"price":"${UNSAFE_ROUNDED}"`)
      const product = parseProduct(raw)
      expect(product.variants[0]?.regular).toBe(UNSAFE_ROUNDED)
    })

    it('preserves tags string containing unsafe digit lexeme', () => {
      const raw = productRaw().replace('"tags":"tema, cor, tamanho"', `"tags":"${UNSAFE_ROUNDED}"`)
      const product = parseProduct(raw)
      expect(product.tags).toEqual([UNSAFE_ROUNDED])
    })

    it('preserves name pt string exactly matching unsafe digits', () => {
      const raw = productRaw().replace(
        '"name":{"pt":"Peça sintética"}',
        `"name":{"pt":"${UNSAFE_ROUNDED}"}`,
      )
      const product = parseProduct(raw)
      expect(product.name).toEqual({ pt: UNSAFE_ROUNDED })
    })

    it('preserves name pt with escaped quotes and backslashes', () => {
      const literal = String.raw`say \"${UNSAFE_ROUNDED}\" \\ path`
      const raw = productRaw().replace(
        '"name":{"pt":"Peça sintética"}',
        `"name":{"pt":"${literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"}`,
      )
      const product = parseProduct(raw)
      expect(product.name?.pt).toBe(literal)
    })

    it('preserves marker-like name strings literally', () => {
      for (const literal of [`bigint:${UNSAFE_ROUNDED}`, `{"source":"${UNSAFE_ROUNDED}"}`]) {
        const escaped = literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const raw = productRaw().replace(
          '"name":{"pt":"Peça sintética"}',
          `"name":{"pt":"${escaped}"}`,
        )
        const product = parseProduct(raw)
        expect(product.name?.pt).toBe(literal)
      }
    })

    it('preserves order number as JSON string of unsafe digits', () => {
      const order = parseOrder(orderRaw({ number: UNSAFE_ROUNDED }))
      expect(order.number).toBe(UNSAFE_ROUNDED)
    })
  })

  describe('6.5 limits and safety', () => {
    it('rejects raw payload longer than 1_048_576 characters', () => {
      const padding = ' '.repeat(1_048_576 - productRaw().length + 1)
      expectProtocol(() => parseProduct(productRaw() + padding))
    })
  })
})

describe('NUV-07-R3 noncanonical numeric ID lexemes', () => {
  const MAX_SAFE = '9007199254740991'
  const LOSSY_FRACTION = '9007199254740991.1'
  const LOSSY_EXPONENT = '9.0071992547409911e15'
  const NONCANONICAL_ONE = '1.0'

  const noncanonicalProductIdTokens = [
    LOSSY_FRACTION,
    '9007199254740991.4',
    '9007199254740991.0',
    LOSSY_EXPONENT,
    '1e0',
    '1E+0',
    '1.000e0',
    NONCANONICAL_ONE,
  ] as const

  function assertNoBigInt(value: unknown): void {
    if (typeof value === 'bigint') throw new Error('unexpected bigint')
    if (Array.isArray(value)) {
      for (const entry of value) assertNoBigInt(entry)
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const entry of Object.values(value)) assertNoBigInt(entry)
    }
  }

  describe('7.1 and 7.2 fractions and exponents on Product.id', () => {
    it.each(noncanonicalProductIdTokens)('rejects product id lexeme %s', (token) => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', token)))
    })

    it('does not accept 9007199254740991.1 as exact decimal id 9007199254740991', () => {
      try {
        const product = parseProduct(withUnquotedId(productRaw(), 'id', LOSSY_FRACTION))
        expect(product.id).not.toBe(MAX_SAFE)
        expect.fail('expected NuvemshopProtocolError')
      } catch (error) {
        expect(error).toBeInstanceOf(NuvemshopProtocolError)
      }
    })
  })

  describe('7.3 nested IDs', () => {
    const nestedTargets = [
      {
        label: 'Variant.id',
        build: (token: string) =>
          productRaw().replace('"variants":[{"id":101', `"variants":[{"id":${token}`),
        parse: parseProduct,
      },
      {
        label: 'Variant.product_id',
        build: (token: string) =>
          productRaw().replace('"product_id":1234', `"product_id":${token}`),
        parse: parseProduct,
      },
      {
        label: 'Product.categories[].id',
        build: (token: string) =>
          productRaw().replace('"categories":[{"id":4567', `"categories":[{"id":${token}`),
        parse: parseProduct,
      },
      {
        label: 'Product.categories[] bare id',
        build: (token: string) =>
          productRaw().replace(
            '"categories":[{"id":4567,"name":{"pt":"Série"},"description":{"pt":"não exportar"}}]',
            `"categories":[${token}]`,
          ),
        parse: parseProduct,
      },
      {
        label: 'Category.id',
        build: (token: string) => withUnquotedId(categoryRaw(), 'id', token),
        parse: parseCategory,
      },
      {
        label: 'Category.parent',
        build: (token: string) => categoryRaw().replace('"parent":null', `"parent":${token}`),
        parse: parseCategory,
      },
      {
        label: 'Order.id',
        build: (token: string) => withUnquotedId(orderRaw(), 'id', token),
        parse: parseOrder,
      },
      {
        label: 'Order.number',
        build: (token: string) => withUnquotedId(orderRaw(), 'number', token),
        parse: parseOrder,
      },
      {
        label: 'Order.products[].id',
        build: (token: string) =>
          orderRaw().replace('"products":[{"id":1069053829', `"products":[{"id":${token}`),
        parse: parseOrder,
      },
      {
        label: 'Order.products[].product_id',
        build: (token: string) => orderRaw().replace('"product_id":111', `"product_id":${token}`),
        parse: parseOrder,
      },
      {
        label: 'Order.products[].variant_id',
        build: (token: string) =>
          orderRaw().replace('"variant_id":"426215948"', `"variant_id":${token}`),
        parse: parseOrder,
      },
    ] as const

    const nestedTokens = [LOSSY_FRACTION, LOSSY_EXPONENT, NONCANONICAL_ONE] as const

    it.each(
      nestedTargets.flatMap((target) =>
        nestedTokens.map((token) => [token, target.label, target] as const),
      ),
    )('rejects noncanonical lexeme %s on %s', (token, label, target) => {
      expectProtocol(() => target.parse(target.build(token)))
    })
  })

  describe('7.4 valid canonical ids', () => {
    it('preserves fixture product id 1234', () => {
      expect(parseProduct(productRaw()).id).toBe('1234')
    })

    it('preserves unquoted MAX_SAFE_INTEGER product id', () => {
      expect(parseProduct(withUnquotedId(productRaw(), 'id', MAX_SAFE)).id).toBe(MAX_SAFE)
    })

    it('preserves unquoted first integer above MAX_SAFE_INTEGER', () => {
      expect(parseProduct(withUnquotedId(productRaw(), 'id', '9007199254740992')).id).toBe(
        '9007199254740992',
      )
    })

    it('preserves unquoted HUGE_ID product id', () => {
      expect(parseProduct(withUnquotedId(productRaw(), 'id', HUGE_ID)).id).toBe(HUGE_ID)
    })

    it('preserves unquoted ABOVE_INT64_ID product id', () => {
      expect(parseProduct(withUnquotedId(productRaw(), 'id', ABOVE_INT64_ID)).id).toBe(
        ABOVE_INT64_ID,
      )
    })

    it('preserves JSON string product id HUGE_ID', () => {
      expect(parseProduct(productRaw({ id: HUGE_ID })).id).toBe(HUGE_ID)
    })

    it('keeps order number distinct from order id', () => {
      const order = parseOrder(orderRaw())
      expect(order.number).toBe('306')
      expect(order.id).toBe('871254203')
      expect(order.number).not.toBe(order.id)
    })

    it('canonicalizes zero-padded order number JSON string', () => {
      expect(parseOrder(orderRaw({ number: '0306' })).number).toBe('306')
    })

    it('accepts canonical unquoted product id 1', () => {
      expect(parseProduct(withUnquotedId(productRaw(), 'id', '1')).id).toBe('1')
    })
  })

  describe('7.5 non-ID fields', () => {
    it('ignores unknown numeric seo_title 1.5', () => {
      const raw = productRaw().replace('"seo_title":"não exportar"', '"seo_title":1.5')
      const product = parseProduct(raw)
      expect(product).not.toHaveProperty('seo_title')
      expect(JSON.stringify(product)).not.toContain('1.5')
      expect(product.id).toBe('1234')
    })

    it('ignores unknown numeric seo_title lossy fraction', () => {
      const raw = productRaw().replace(
        '"seo_title":"não exportar"',
        `"seo_title":${LOSSY_FRACTION}`,
      )
      const product = parseProduct(raw)
      expect(product).not.toHaveProperty('seo_title')
      expect(JSON.stringify(product)).not.toContain(LOSSY_FRACTION)
      expect(product.id).toBe('1234')
    })

    it('rejects variant price as unquoted 1.0', () => {
      expectProtocol(() => parseProduct(productRaw().replace('"price":"25.00"', '"price":1.0')))
    })

    it('rejects order total as unquoted 1.0', () => {
      expectProtocol(() => parseOrder(orderRaw().replace('"total":"80.00"', '"total":1.0')))
    })

    it('rejects localized name pt as lossy fraction', () => {
      const raw = productRaw().replace(
        '"name":{"pt":"Peça sintética"}',
        `"name":{"pt":${LOSSY_FRACTION}}`,
      )
      expectProtocol(() => parseProduct(raw))
    })

    it('rejects product tags as unquoted 1.0', () => {
      expectProtocol(() =>
        parseProduct(productRaw().replace('"tags":"tema, cor, tamanho"', '"tags":1.0')),
      )
    })

    it('rejects order status as unquoted 1.0', () => {
      expectProtocol(() => parseOrder(orderRaw().replace('"status":"open"', '"status":1.0')))
    })

    it('accepts canonical unquoted quantity 1 as string 1', () => {
      const order = parseOrder(orderRaw().replace('"quantity":"1"', '"quantity":1'))
      expect(order.lineItems[0]?.quantity).toBe('1')
    })

    it('preserves fixture quantity string 1', () => {
      expect(parseOrder(orderRaw()).lineItems[0]?.quantity).toBe('1')
    })

    it('accepts quantity string 0', () => {
      expect(
        parseOrder(orderRaw().replace('"quantity":"1"', '"quantity":"0"')).lineItems[0]?.quantity,
      ).toBe('0')
    })

    it('preserves payment installments 1 on fixture order', () => {
      expect(parseOrder(orderRaw()).payment.installments).toBe(1)
    })

    it('keeps quantity 1.0 on the existing safe-integer rule', () => {
      const order = parseOrder(orderRaw().replace('"quantity":"1"', '"quantity":1.0'))
      expect(order.lineItems[0]?.quantity).toBe('1')
    })

    it('keeps installments 1e0 on the existing safe-integer rule', () => {
      const order = parseOrder(orderRaw().replace('"installments":1', '"installments":1e0'))
      expect(order.payment.installments).toBe(1)
    })

    it('rejects optional handle as unquoted 1.0', () => {
      expectProtocol(() =>
        parseProduct(productRaw().replace('"handle":{"pt":"peca-sintetica"}', '"handle":1.0')),
      )
    })

    it('rejects payment_details as unquoted 1.0', () => {
      expectProtocol(() =>
        parseOrder(
          orderRaw().replace(
            '"payment_details":{"method":"custom","credit_card_company":null,"installments":1}',
            '"payment_details":1.0',
          ),
        ),
      )
    })
  })

  describe('7.6 lexically invalid JSON', () => {
    it('rejects product id leading zero lexeme 01', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '01')))
    })

    it('rejects incomplete exponent on MAX_SAFE_INTEGER id', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '9007199254740991e')))
    })

    it('rejects incomplete fraction on MAX_SAFE_INTEGER id', () => {
      expectProtocol(() => parseProduct(withUnquotedId(productRaw(), 'id', '9007199254740991.')))
    })

    it('rejects trailing comma object', () => {
      expectProtocol(() => parseProduct('{"id":123,}'))
    })

    it('rejects trailing garbage after object', () => {
      expectProtocol(() => parseProduct('{"id":123} extra'))
    })

    it('rejects unterminated product raw string', () => {
      expectProtocol(() => parseProduct(productRaw().slice(0, -1)))
    })

    it('rejects invalid escape in localized name', () => {
      const raw = productRaw().replace('"name":{"pt":"Peça sintética"}', '"name":{"pt":"\\q"}')
      expectProtocol(() => parseProduct(raw))
    })
  })

  describe('7.7 missing context.source', () => {
    it('does not treat a safe integer as a canonical numeric id when the lexeme is unavailable', () => {
      const revived = reviveLosslessInteger('id', 9007199254740991, {})
      expect(readDecimalId(revived)).toBeUndefined()
      expect(readOrderNumber(revived)).toBeUndefined()

      const revivedOne = reviveLosslessInteger('number', 1, undefined)
      expect(readDecimalId(revivedOne)).toBeUndefined()
      expect(readOrderNumber(revivedOne)).toBeUndefined()
    })

    it('preserves parseCallerDecimalId for safe integers', () => {
      expect(parseCallerDecimalId(42)).toBe('42')
      expect(parseCallerDecimalId(9007199254740991)).toBe('9007199254740991')
    })

    it('preserves JSON string product id via parseProduct', () => {
      expect(parseProduct(productRaw({ id: HUGE_ID })).id).toBe(HUGE_ID)
    })

    it('rejects bigint caller decimal id', () => {
      expectValidation(() => parseCallerDecimalId(BigInt(HUGE_ID)))
    })

    it('rejects unsafe number caller decimal id', () => {
      expectValidation(() => parseCallerDecimalId(Number(HUGE_ID)))
    })
  })

  describe('7.8 safety', () => {
    it('rejects raw payload longer than 1_048_576 characters', () => {
      const padding = ' '.repeat(1_048_576 - productRaw().length + 1)
      expectProtocol(() => parseProduct(productRaw() + padding))
    })

    it('stringifies normalized huge id product without bigint values', () => {
      const product = parseProduct(withUnquotedId(productRaw(), 'id', HUGE_ID))
      const encoded = JSON.stringify(product)
      expect(encoded).toContain(HUGE_ID)
      expect(encoded).not.toContain('bigint')
      assertNoBigInt(product)
    })

    it('does not echo lossy id lexeme in protocol error payload', () => {
      try {
        parseProduct(withUnquotedId(productRaw(), 'id', LOSSY_FRACTION))
        expect.fail('expected NuvemshopProtocolError')
      } catch (error) {
        expect(error).toBeInstanceOf(NuvemshopProtocolError)
        if (!(error instanceof NuvemshopProtocolError)) throw error
        expect(error.message).toBe('Nuvemshop response is incompatible.')
        expect(JSON.stringify(error.toJSON())).not.toContain(LOSSY_FRACTION)
        expect(JSON.stringify(error.toJSON())).not.toContain(LOSSY_EXPONENT)
      }
    })
  })
})
