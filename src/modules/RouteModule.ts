import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  AptosResourceType,
  Payload,
} from '../types/aptos'
import { d } from '../utils/number'
import {
  getCoinInWithFees,
  getCoinOutWithFees,
  LiquidityPoolResource,
  withSlippage,
} from './SwapModule'
import { composeType } from '../utils/contract'
import Decimal from 'decimal.js'
import { BigNumber } from '../types/common'

export type Trade = {
  coinPairList: LiquidityPoolResource[] // coin pair info with reserve amount
  amountList: Decimal[]  // coin amount, from `fromCoin` to `toCoin`
  coinTypeList: string[]  // coin type, from `fromCoin` to `toCoin`
  priceImpact: Decimal  // price impact of this trade
}

export type SwapCoinParams = {
  fromCoin: AptosResourceType
  toCoin: AptosResourceType
  amount: BigNumber
}

export type SwapCoinPayload = {
  trade: Trade
  slippage: BigNumber
}

const U64MAX: Decimal = d('18446744073709551615') // 2^64-1
const fee = d(30)

export class RouteModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  /**
   * FromExactCoinToCoin
   * @param pairList all pair list from `getAllLPCoinResourcesWithAdmin()`
   * @param coinTypeOutOrigin out coin type
   * @param maxNumResults top result nums
   * @param maxHops remaining hops
   * @param currentPairs current path pairs
   * @param currentAmounts current path amounts
   * @param nextCoinType next coin type
   * @param nextAmountIn next coin amount in
   * @param fee swap fee
   * @param bestTrades saved trade results
   * @returns bestTrades
   */
  async bestTradeExactIn(
    pairList: LiquidityPoolResource[],
    coinTypeInOrigin: AptosResourceType,
    coinTypeOutOrigin: AptosResourceType,
    maxNumResults: number,
    maxHops: number,
    currentPairs: LiquidityPoolResource[],
    currentAmounts: Decimal[],
    nextCoinType: AptosResourceType,
    nextAmountIn: Decimal,
    fee: Decimal,
    bestTrades: Trade[],
  ): Promise<Trade[]> {
    for (let i = 0; i < pairList.length; i++) {
      const pair = pairList[i]
      if (!pair) continue
      if (!(pair.coinX == nextCoinType) && !(pair.coinY == nextCoinType)) continue
      if (pair.coinXReserve === '0' || pair.coinYReserve === '0') continue
      const coinTypeOut = (pair.coinX == nextCoinType)
        ? pair.coinY
        : pair.coinX
      const [reserveIn, reserveOut] = (pair.coinX == nextCoinType)
        ? [d(pair.coinXReserve), d(pair.coinYReserve)]
        : [d(pair.coinYReserve), d(pair.coinXReserve)]
      const coinOut = getCoinOutWithFees(nextAmountIn, reserveIn, reserveOut, fee)
      if (coinOut.lt(0) || coinOut.gt(reserveOut)) continue
      // we have arrived at the output token, so this is the final trade of one of the paths
      if (coinTypeOut == coinTypeOutOrigin) {
        const coinPairList = [...currentPairs, pair]
        const amountList = [...currentAmounts, coinOut]
        const coinTypeList = getCoinTypeList(coinTypeInOrigin, coinPairList)
        const priceImpact = getPriceImpact(coinTypeInOrigin, coinPairList, amountList, fee)
        const newTrade: Trade = {
          coinPairList,
          amountList,
          coinTypeList,
          priceImpact,
        }
        sortedInsert(
          bestTrades,
          newTrade,
          maxNumResults,
          tradeComparator,
        )
      } else if (maxHops > 1 && pairList.length > 1) {
        const pairListExcludingThisPair = pairList.slice(0, i).concat(pairList.slice(i + 1, pairList.length))

        this.bestTradeExactIn(
          pairListExcludingThisPair,
          coinTypeInOrigin,
          coinTypeOutOrigin,
          maxNumResults,
          maxHops - 1,
          [...currentPairs, pair],
          [...currentAmounts, coinOut],
          coinTypeOut,
          coinOut,
          fee,
          bestTrades,
        )
      }
    }

    return bestTrades
  }


  /**
   * FromCoinToExactCoin
   * @param pairList all pair list from `getAllLPCoinResourcesWithAdmin()`
   * @param coinTypeInOrigin in coin type
   * @param maxNumResults top result nums
   * @param maxHops remaining hops
   * @param currentPairs current path pairs
   * @param currentAmounts current path amounts
   * @param nextCoinType next coin type
   * @param nextAmountOut next coin amount out
   * @param fee swap fee
   * @param bestTrades saved trade results
   * @returns bestTrades
   */
  async bestTradeExactOut(
    pairList: LiquidityPoolResource[],
    coinTypeInOrigin: AptosResourceType,
    coinTypeOutOrigin: AptosResourceType,
    maxNumResults: number,
    maxHops: number,
    currentPairs: LiquidityPoolResource[],
    currentAmounts: Decimal[],
    nextCoinType: AptosResourceType,
    nextAmountOut: Decimal,
    fee: Decimal,
    bestTrades: Trade[],
  ): Promise<Trade[]> {
    for (let i = 0; i < pairList.length; i++) {
      const pair = pairList[i]
      if (!pair) continue
      if (!(pair.coinX == nextCoinType) && !(pair.coinY == nextCoinType)) continue
      if (pair.coinXReserve === '0' || pair.coinYReserve === '0') continue
      const coinTypeIn = (pair.coinX == nextCoinType)
        ? pair.coinY
        : pair.coinX
      const [reserveIn, reserveOut] = (pair.coinX == nextCoinType)
        ? [d(pair.coinYReserve), d(pair.coinXReserve)]
        : [d(pair.coinXReserve), d(pair.coinYReserve)]
      const coinIn = getCoinInWithFees(nextAmountOut, reserveOut, reserveIn, fee)
      if (coinIn.lt(0) || coinIn.gt(U64MAX)) continue
      // we have arrived at the output token, so this is the final trade of one of the paths
      if (coinTypeIn == coinTypeInOrigin) {
        const coinPairList = [pair, ...currentPairs]
        const amountList = [coinIn, ...currentAmounts]
        const coinTypeList = getCoinTypeList(coinTypeInOrigin, coinPairList)
        const priceImpact = getPriceImpact(coinTypeInOrigin, coinPairList, amountList, fee)
        const newTrade: Trade = {
          coinPairList,
          amountList,
          coinTypeList,
          priceImpact,
        }
        sortedInsert(
          bestTrades,
          newTrade,
          maxNumResults,
          tradeComparator,
        )
      } else if (maxHops > 1 && pairList.length > 1) {
        const pairListExcludingThisPair = pairList.slice(0, i).concat(pairList.slice(i + 1, pairList.length))

        this.bestTradeExactOut(
          pairListExcludingThisPair,
          coinTypeInOrigin,
          coinTypeOutOrigin,
          maxNumResults,
          maxHops - 1,
          [pair, ...currentPairs],
          [coinIn, ...currentAmounts],
          coinTypeIn,
          coinIn,
          fee,
          bestTrades,
        )
      }
    }

    return bestTrades
  }

  async getRouteSwapExactCoinForCoin({
    fromCoin,
    toCoin,
    amount,
  }: SwapCoinParams): Promise<Trade[]> {
    amount = d(amount)
    const pairList = await this._sdk.swap.getAllLPCoinResourcesWithAdmin()
    const bestTrades = this.bestTradeExactIn(
      pairList,
      fromCoin,
      toCoin,
      3,
      3,
      [],
      [amount],
      fromCoin,
      amount,
      fee,
      [],
    )
    return bestTrades
  }

  async getRouteSwapCoinForExactCoin({
    fromCoin,
    toCoin,
    amount,
  }: SwapCoinParams): Promise<Trade[]> {
    amount = d(amount)
    const pairList = await this._sdk.swap.getAllLPCoinResourcesWithAdmin()
    const bestTrades = this.bestTradeExactOut(
      pairList,
      fromCoin,
      toCoin,
      3,
      3,
      [],
      [amount],
      toCoin,
      amount,
      fee,
      [],
    )
    return bestTrades
  }

  swapExactCoinForCoinPayload({
    trade,
    slippage,
  }: SwapCoinPayload): Payload {
    if (trade.coinPairList.length > 3 || trade.coinPairList.length < 1) {
      throw new Error(`Invalid coin pair length (${trade.coinPairList.length}) value`)
    }
    const { modules } = this.sdk.networkOptions

    let functionEntryName = ''
    if (trade.coinPairList.length == 1) {
      functionEntryName = 'swap_exact_coins_for_coins_entry'
    } else if (trade.coinPairList.length == 2) {
      functionEntryName = 'swap_exact_coins_for_coins_2_pair_entry'
    } else if (trade.coinPairList.length == 3) {
      functionEntryName = 'swap_exact_coins_for_coins_3_pair_entry'
    }

    const functionName = composeType(
      modules.Scripts,
      functionEntryName
    )

    const typeArguments = trade.coinTypeList

    const fromAmount = trade.amountList[0]
    const toAmount = withSlippage(d(trade.amountList[trade.amountList.length - 1]), d(slippage), 'minus')

    const args = [fromAmount.toString(), toAmount.toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: typeArguments,
      arguments: args,
    }
  }

  swapCoinForExactCoinPayload({
    trade,
    slippage,
  }: SwapCoinPayload): Payload {
    if (trade.coinPairList.length > 3 || trade.coinPairList.length < 1) {
      throw new Error(`Invalid coin pair length (${trade.coinPairList.length}) value`)
    }
    const { modules } = this.sdk.networkOptions

    let functionEntryName = ''
    if (trade.coinPairList.length == 1) {
      functionEntryName = 'swap_coins_for_exact_coins_entry'
    } else if (trade.coinPairList.length == 2) {
      functionEntryName = 'swap_coins_for_exact_coins_2_pair_entry'
    } else if (trade.coinPairList.length == 3) {
      functionEntryName = 'swap_coins_for_exact_coins_3_pair_entry'
    }

    const functionName = composeType(
      modules.Scripts,
      functionEntryName
    )

    const typeArguments = trade.coinTypeList

    const toAmount = trade.amountList[trade.amountList.length - 1]
    const fromAmount = withSlippage(d(trade.amountList[0]), d(slippage), 'plus')

    const args = [toAmount.toString(), fromAmount.toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: typeArguments,
      arguments: args,
    }
  }
}

export function sortedInsert<T>(items: T[], add: T, maxSize: number, comparator: (a: T, b: T) => number) {
  let index
  for (index = 0; index < items.length; index++) {
    const comp = comparator(items[index], add)
    if (comp >= 0) {
      break
    } else if (comp == -1) {
      continue
    }
  }
  items.splice(index, 0, add)
  if (items.length > maxSize) {
    items.pop()
  }
}

export function tradeComparator(trade1: Trade, trade2: Trade): number {
  const trade1In = d(trade1.amountList[0])
  const trade2In = d(trade2.amountList[0])
  const trade1Out = d(trade1.amountList[trade1.amountList.length - 1])
  const trade2Out = d(trade2.amountList[trade2.amountList.length - 1])
  if (trade1In.eq(trade2In)) {
    if (trade1Out.eq(trade2Out)) {
      return trade1.amountList.length - trade2.amountList.length
    }
    if (trade1Out.lessThan(trade2Out)) {
      return 1
    } else {
      return -1
    }
  } else {
    if (trade1In.lessThan(trade2In)) {
      return -1
    } else {
      return 1
    }
  }
}

export function getCoinTypeList(coinInType: AptosResourceType, coinPairList: LiquidityPoolResource[]): AptosResourceType[] {
  const coinTypeList = [coinInType]
  let currentCoinType = coinInType
  for (let i = 0; i < coinPairList.length; i++) {
    const coinPair = coinPairList[i]
    if (!coinPair) continue
    if (coinPair.coinX == currentCoinType) {
      currentCoinType = coinPair.coinY
      coinTypeList.push(coinPair.coinY)
    } else {
      currentCoinType = coinPair.coinX
      coinTypeList.push(coinPair.coinX)
    }
  }
  return coinTypeList
}

// calculated as: abs(realAmountOut - noImpactAmountOut) / noImpactAmountOut
export function getPriceImpact(coinInType: AptosResourceType, coinPairList: LiquidityPoolResource[], amountList: Decimal[], fee: Decimal): Decimal {
  const realAmountOut = amountList[amountList.length - 1]
  let noImpactAmountOut = amountList[0].mul(d(10000).sub(fee)).div(10000)
  let currentCoinType = coinInType
  for (let i = 0; i < coinPairList.length; i++) {
    const coinPair = coinPairList[i]
    if (!coinPair) continue
    if (coinPair.coinX == currentCoinType) {
      currentCoinType = coinPair.coinY
      noImpactAmountOut = noImpactAmountOut.mul(d(coinPair.coinYReserve)).div(d(coinPair.coinXReserve))
    } else {
      currentCoinType = coinPair.coinX
      noImpactAmountOut = noImpactAmountOut.mul(d(coinPair.coinXReserve)).div(d(coinPair.coinYReserve))
    }
  }
  const priceImpact = realAmountOut.sub(noImpactAmountOut).div(noImpactAmountOut)
  return priceImpact.abs()
}
