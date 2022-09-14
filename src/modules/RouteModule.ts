import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  AptosResourceType,
  Payload,
} from '../types/aptos'
import { d } from '../utils/number'
import {
  CoinPair,
  getCoinInWithFees,
  getCoinOutWithFees,
  LiquidityPoolResource,
  withSlippage,
} from './SwapModule'
import { notEmpty } from '../utils/is'
import { composeSwapPoolData, composeType } from '../utils/contract'
import {
  SwapPoolData,
} from '../types/swap'

type Trade = {
  coinPairList: CoinPair[]
  amountList: string[]
}

export type SwapCoinParams = {
  fromCoin: AptosResourceType
  toCoin: AptosResourceType
  amount: string
}

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
   * @param coinTypeOutFinal out coin type
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
    coinTypeOutFinal: AptosResourceType,
    maxNumResults: number,
    maxHops: number,
    currentPairs: LiquidityPoolResource[],
    currentAmounts: string[],
    nextCoinType: AptosResourceType,
    nextAmountIn: string,
    fee: string,
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
          ? [pair.coinXReserve, pair.coinYReserve]
          : [pair.coinYReserve, pair.coinXReserve]
        const coinOut = getCoinOutWithFees(d(nextAmountIn), d(reserveIn), d(reserveOut), d(fee))
        if (coinOut.lessThan(d(0) || coinOut.greaterThan(d(reserveOut)))) continue
        // we have arrived at the output token, so this is the final trade of one of the paths
        if (coinTypeOut == coinTypeOutFinal) {
          const pairs = [...currentPairs, pair]
          const coinPairList = pairs.filter(notEmpty).map(v => {
            return {
              coinX: v.coinX,
              coinY: v.coinY,
            }
          })
          const newTrade = {
            coinPairList,
            amountList: [...currentAmounts, coinOut.toString()],
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
            coinTypeOutFinal,
            maxNumResults,
            maxHops - 1,
            [...currentPairs, pair],
            [...currentAmounts, coinOut.toString()],
            coinTypeOut,
            coinOut.toString(),
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
   * @param coinTypeInFinal in coin type
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
    coinTypeInFinal: AptosResourceType,
    maxNumResults: number,
    maxHops: number,
    currentPairs: LiquidityPoolResource[],
    currentAmounts: string[],
    nextCoinType: AptosResourceType,
    nextAmountOut: string,
    fee: string,
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
          ? [pair.coinYReserve, pair.coinXReserve]
          : [pair.coinXReserve, pair.coinYReserve]
        const coinIn = getCoinInWithFees(d(nextAmountOut), d(reserveOut), d(reserveIn), d(fee))
        if (coinIn.lessThan(d(0) || coinIn.greaterThan(d(reserveIn)))) continue
        // we have arrived at the output token, so this is the final trade of one of the paths
        if (coinTypeIn == coinTypeInFinal) {
          const pairs = [pair, ...currentPairs]
          const coinPairList = pairs.filter(notEmpty).map(v => {
            return {
              coinX: v.coinX,
              coinY: v.coinY,
            }
          })
          const newTrade = {
            coinPairList,
            amountList: [coinIn.toString(), ...currentAmounts],
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
            coinTypeInFinal,
            maxNumResults,
            maxHops - 1,
            [pair, ...currentPairs],
            [coinIn.toString(), ...currentAmounts],
            coinTypeIn,
            coinIn.toString(),
            fee,
            bestTrades,
          )
        }
    }

    return bestTrades
  }

  async getRouteSwapExactCoinForCoin(params: SwapCoinParams): Promise<Trade[]> {
    const { modules } = this.sdk.networkOptions
    const task1 = this._sdk.swap.getAllLPCoinResourcesWithAdmin()
    const swapPoolDataType = composeSwapPoolData(modules.DeployerAddress)
    const task2 = this.sdk.resources.fetchAccountResource<SwapPoolData>(
      modules.DeployerAddress,
      swapPoolDataType
    )
    const [pairList, swapPoolData] = await Promise.all([task1, task2])
    if (!swapPoolData) {
      throw new Error(`swapPoolData (${swapPoolDataType}) not found`)
    }

    const fee = swapPoolData.data.swap_fee
    const bestTrades = this.bestTradeExactIn(
      pairList,
      params.toCoin,
      3,
      3,
      [],
      [params.amount],
      params.fromCoin,
      params.amount,
      fee,
      [],
    )
    return bestTrades
  }

  async getRouteSwapCoinForExactCoin(params: SwapCoinParams): Promise<Trade[]> {
    const { modules } = this.sdk.networkOptions
    const task1 = this._sdk.swap.getAllLPCoinResourcesWithAdmin()
    const swapPoolDataType = composeSwapPoolData(modules.DeployerAddress)
    const task2 = this.sdk.resources.fetchAccountResource<SwapPoolData>(
      modules.DeployerAddress,
      swapPoolDataType
    )
    const [pairList, swapPoolData] = await Promise.all([task1, task2])
    if (!swapPoolData) {
      throw new Error(`swapPoolData (${swapPoolDataType}) not found`)
    }

    const fee = swapPoolData.data.swap_fee
    const bestTrades = this.bestTradeExactOut(
      pairList,
      params.fromCoin,
      3,
      3,
      [],
      [params.amount],
      params.toCoin,
      params.amount,
      fee,
      [],
    )
    return bestTrades
  }

  swapExactCoinForCoinPayload(
      coinInType: AptosResourceType,
      params: Trade,
      toAddress: AptosResourceType,
      slippage: number,
      deadline: number,
    ): Payload {
    if (params.coinPairList.length > 3 || params.coinPairList.length < 1) {
      throw new Error(`Invalid coin pair length (${params.coinPairList.length}) value`)
    }
    const { modules } = this.sdk.networkOptions

    let functionEntryName = ''
    if (params.coinPairList.length == 1) {
      functionEntryName = 'swap_exact_coins_for_coins_entry'
    } else if (params.coinPairList.length == 2) {
      functionEntryName = 'swap_exact_coins_for_coins_2_pair_entry'
    } else if (params.coinPairList.length == 3) {
      functionEntryName = 'swap_exact_coins_for_coins_3_pair_entry'
    }

    const functionName = composeType(
      modules.Scripts,
      functionEntryName
    )

    const typeArguments = getCoinTypeList(coinInType, params.coinPairList)

    const fromAmount = params.amountList[0]
    const toAmount = withSlippage(d(params.amountList[params.amountList.length - 1]), d(slippage), 'minus')

    const deadlineArgs = Math.floor(Date.now() / 1000) + deadline * 60

    const args = [modules.ResourceAccountAddress, fromAmount, d(toAmount).toString(), toAddress, d(deadlineArgs).toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      typeArguments: typeArguments,
      arguments: args,
    }
  }

  swapCoinForExactCoinPayload(
      coinInType: AptosResourceType,
      params: Trade,
      toAddress: AptosResourceType,
      slippage: number,
      deadline: number,
    ): Payload {
    if (params.coinPairList.length > 3 || params.coinPairList.length < 1) {
      throw new Error(`Invalid coin pair length (${params.coinPairList.length}) value`)
    }
    const { modules } = this.sdk.networkOptions

    let functionEntryName = ''
    if (params.coinPairList.length == 1) {
      functionEntryName = 'swap_coins_for_exact_coins_entry'
    } else if (params.coinPairList.length == 2) {
      functionEntryName = 'swap_coins_for_exact_coins_2_pair_entry'
    } else if (params.coinPairList.length == 3) {
      functionEntryName = 'swap_coins_for_exact_coins_3_pair_entry'
    }

    const functionName = composeType(
      modules.Scripts,
      functionEntryName
    )

    const typeArguments = getCoinTypeList(coinInType, params.coinPairList)

    const toAmount = params.amountList[params.amountList.length - 1]
    const fromAmount = withSlippage(d(params.amountList[0]), d(slippage), 'plus')

    const deadlineArgs = Math.floor(Date.now() / 1000) + deadline * 60

    const args = [modules.ResourceAccountAddress, toAmount, d(fromAmount).toString(), toAddress, d(deadlineArgs).toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      typeArguments: typeArguments,
      arguments: args,
    }
  }
}

function sortedInsert<T>(items: T[], add: T, maxSize: number, comparator: (a: T, b: T) => number) {
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

function tradeComparator(trade1: Trade, trade2: Trade): number {
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

function getCoinTypeList(coinInType: AptosResourceType, coinPairList: CoinPair[]): AptosResourceType[] {
  const coinTypeList = [coinInType]
  let currentCoinType = coinInType
  for (let i = 0; i < coinPairList.length; i++) {
    const coinPair = coinPairList[i]
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
