import Decimal from 'decimal.js'
import { BigNumber } from '../main'

export function d(value?: Decimal.Value) : Decimal {
  if (Decimal.isDecimal(value)) {
    return value as Decimal
  }
  return new Decimal(value === undefined ? 0 : value)
}

export function minsToDeadline(deadline: BigNumber): Decimal {
  return d(deadline).mul(60).add(d(Date.now() / 1000).floor())
}


export function pow10(decimals: BigNumber) : Decimal {
  return d(10).pow(d(decimals).abs())
}

export function mulDecimals(pretty: BigNumber, decimals: BigNumber) : Decimal {
  return d(pretty).mul(pow10(decimals || 0))
}

export function divDecimals(amount: BigNumber, decimals: BigNumber) : Decimal {
  return d(amount).div(pow10(decimals || 0))
}

export const BP = d(1).div(10000) // 1BP is 0.01%
