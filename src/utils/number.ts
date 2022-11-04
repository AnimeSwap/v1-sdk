import Decimal from 'decimal.js'
import { BigNumber } from '../types/common'

Decimal.set({ toExpNeg: -9 })

export function d(value?: BigNumber) : Decimal {
  if (Decimal.isDecimal(value)) {
    return value as Decimal
  }
  return new Decimal(value === undefined ? 0 : value)
}

export function secondsToDeadline(deadline: BigNumber): Decimal {
  return d(deadline).add(d(Date.now() / 1000).floor()).floor()
}

export function pow10(decimals: BigNumber) : Decimal {
  return d(10).pow(d(decimals))
}

export function mulDecimals(pretty: BigNumber, decimals: BigNumber) : Decimal {
  return d(pretty).mul(pow10(decimals || 0))
}

export function divDecimals(amount: BigNumber, decimals: BigNumber) : Decimal {
  return d(amount).div(pow10(decimals || 0))
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}

export const BP = d(1).div(10000) // 1BP is 0.01%
export const YEAR_NS = 365 * 86400 * 1000 * 1000
export const YEAR_S = 365 * 86400
