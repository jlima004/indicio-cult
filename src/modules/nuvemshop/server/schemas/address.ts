import 'server-only'

import type { AddressProjection, MinimizedAddress } from '../types'
import { failProtocol } from './fail'
import { isRecord } from './lossless-json'

const ADDRESS_KEYS = [
  'recipientName',
  'street',
  'number',
  'floor',
  'locality',
  'city',
  'zipcode',
  'provinceName',
  'provinceCode',
  'countryName',
  'countryCode',
] as const

function blankAddress(): MinimizedAddress {
  return emptyMinimizedAddress()
}

export function emptyMinimizedAddress(recipientName: string | null = null): MinimizedAddress {
  return {
    recipientName,
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
  }
}

function optionalString(value: unknown, max = 300): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > max) return undefined
  return value
}

export function minimizeLegacyAddress(value: unknown): MinimizedAddress | null | undefined {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) return undefined
  const street = optionalString(Object.hasOwn(value, 'address') ? value.address : null)
  const number = optionalString(Object.hasOwn(value, 'number') ? value.number : null)
  const floor = optionalString(Object.hasOwn(value, 'floor') ? value.floor : null)
  const locality = optionalString(Object.hasOwn(value, 'locality') ? value.locality : null)
  const city = optionalString(Object.hasOwn(value, 'city') ? value.city : null)
  const zipcode = optionalString(Object.hasOwn(value, 'zipcode') ? value.zipcode : null, 32)
  const recipientName = optionalString(Object.hasOwn(value, 'name') ? value.name : null)
  const province = Object.hasOwn(value, 'province') ? value.province : null
  const country = Object.hasOwn(value, 'country') ? value.country : null
  if (
    street === undefined ||
    number === undefined ||
    floor === undefined ||
    locality === undefined ||
    city === undefined ||
    zipcode === undefined ||
    recipientName === undefined
  ) {
    return undefined
  }
  let provinceName: string | null = null
  let provinceCode: string | null = null
  if (province !== null && province !== undefined) {
    if (typeof province === 'string') {
      if (province.length > 120) return undefined
      provinceName = province
    } else if (isRecord(province)) {
      const name = optionalString(province.name, 120)
      const code = optionalString(province.code, 16)
      if (name === undefined || code === undefined) return undefined
      provinceName = name
      provinceCode = code
    } else return undefined
  }
  let countryName: string | null = null
  let countryCode: string | null = null
  if (country !== null && country !== undefined) {
    if (typeof country === 'string') {
      if (country.length > 120) return undefined
      if (/^[A-Za-z]{2}$/.test(country)) countryCode = country
      else countryName = country
    } else if (isRecord(country)) {
      const name = optionalString(country.name, 120)
      const code = optionalString(country.code, 16)
      if (name === undefined || code === undefined) return undefined
      countryName = name
      countryCode = code
    } else return undefined
  }
  return {
    recipientName,
    street,
    number,
    floor,
    locality,
    city,
    zipcode,
    provinceName,
    provinceCode,
    countryName,
    countryCode,
  }
}

export function minimizeFulfillmentAddress(
  destination: unknown,
  recipient: unknown,
): MinimizedAddress | null | undefined {
  if (destination === undefined || destination === null) return null
  if (!isRecord(destination)) return undefined
  if (recipient !== undefined && recipient !== null && !isRecord(recipient)) return undefined
  const recipientName =
    isRecord(recipient) && Object.hasOwn(recipient, 'name') ? optionalString(recipient.name) : null
  const street = optionalString(Object.hasOwn(destination, 'street') ? destination.street : null)
  const number = optionalString(Object.hasOwn(destination, 'number') ? destination.number : null)
  const floor = optionalString(Object.hasOwn(destination, 'floor') ? destination.floor : null)
  const locality = optionalString(
    Object.hasOwn(destination, 'locality') ? destination.locality : null,
  )
  const city = optionalString(Object.hasOwn(destination, 'city') ? destination.city : null)
  const zipcode = optionalString(
    Object.hasOwn(destination, 'zipcode') ? destination.zipcode : null,
    32,
  )
  if (
    recipientName === undefined ||
    street === undefined ||
    number === undefined ||
    floor === undefined ||
    locality === undefined ||
    city === undefined ||
    zipcode === undefined
  ) {
    return undefined
  }
  const province = Object.hasOwn(destination, 'province') ? destination.province : null
  const country = Object.hasOwn(destination, 'country') ? destination.country : null
  let provinceName: string | null = null
  let provinceCode: string | null = null
  if (province !== null && province !== undefined) {
    if (!isRecord(province) && typeof province !== 'string') return undefined
    if (typeof province === 'string') {
      if (province.length > 120) return undefined
      provinceName = province
    } else {
      const name = optionalString(province.name, 120)
      const code = optionalString(province.code, 16)
      if (name === undefined || code === undefined) return undefined
      provinceName = name
      provinceCode = code
    }
  }
  let countryName: string | null = null
  let countryCode: string | null = null
  if (country !== null && country !== undefined) {
    if (typeof country === 'string') {
      if (country.length > 120) return undefined
      if (/^[A-Za-z]{2}$/.test(country)) countryCode = country
      else countryName = country
    } else if (isRecord(country)) {
      const name = optionalString(country.name, 120)
      const code = optionalString(country.code, 16)
      if (name === undefined || code === undefined) return undefined
      countryName = name
      countryCode = code
    } else return undefined
  }
  return {
    recipientName,
    street,
    number,
    floor,
    locality,
    city,
    zipcode,
    provinceName,
    provinceCode,
    countryName,
    countryCode,
  }
}

export function parseAddressProjection(value: unknown): AddressProjection {
  if (!isRecord(value)) failProtocol('order')
  const provenance = value.provenance
  if (provenance !== 'fulfillment' && provenance !== 'order_legacy_provisional')
    failProtocol('order')
  if (!isRecord(value.address)) failProtocol('order')
  const address = blankAddress()
  const mutable = { ...address }
  for (const key of Object.keys(value.address)) {
    if (!ADDRESS_KEYS.includes(key as (typeof ADDRESS_KEYS)[number])) failProtocol('order')
  }
  for (const key of ADDRESS_KEYS) {
    if (!Object.hasOwn(value.address, key)) continue
    const field = optionalString(value.address[key], key === 'zipcode' ? 32 : 300)
    if (field === undefined) failProtocol('order')
    mutable[key] = field
  }
  return { provenance, address: mutable }
}
