import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  AptosResourceType,
} from '../types/aptos'
import { d, getRandomInt } from '../utils/number'
import {
  CoinPair,
  getCoinInWithFees,
  getCoinOutWithFees,
  LiquidityPoolResource,
} from './SwapModule'
import Decimal from 'decimal.js'
import { composeLP } from '../utils'
import { SwapPoolResource } from '../main'
import { getCoinTypeList, getPriceImpact, sortedInsert, SwapCoinParams, Trade, tradeComparator } from './RouteModule'

const DEFAULT_ROUTE = 5
const U64MAX: Decimal = d('18446744073709551615') // 2^64-1
const fee = d(30)
type Route = Array<CoinPair>
type CoinPair2LiquidityPoolResource = { [key: AptosResourceType]: LiquidityPoolResource } // key of coinType X,Y is: `X, Y`

export class RouteV2Module implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  /**
   * Find all routes from one coin to another
   * @param pairList 
   * @param coinTypeOutOrigin 
   * @param hops 
   * @param currentPairs 
   * @param currentCoinType 
   * @param routes 
   * @returns 
   */
  findAllRoutes(
    pairList: Array<CoinPair>,
    coinTypeOutOrigin: AptosResourceType,
    hops: number,
    currentPairs: Array<CoinPair>,
    currentCoinType: AptosResourceType,
    routes: Array<Route>,
  ): Array<Route> {
    for (let i = 0; i < pairList.length; i++) {
      const pair = pairList[i]
      if (!(pair.coinX == currentCoinType) && !(pair.coinY == currentCoinType)) continue
      const coinTypeOut = (pair.coinX == currentCoinType)
        ? pair.coinY
        : pair.coinX
      if (coinTypeOut == coinTypeOutOrigin) {
        // find route
        routes.push([...currentPairs, pair])
      } else if (hops > 1 && pairList.length > 1) {
        const pairListExcludingThisPair = pairList.slice(0, i).concat(pairList.slice(i + 1, pairList.length))
        this.findAllRoutes(
          pairListExcludingThisPair,
          coinTypeOutOrigin,
          hops - 1,
          [...currentPairs, pair],
          coinTypeOut,
          routes
        )
      }
    }
    return routes
  }

  /**
   * Get all routes from `fromCoin` to `toCoin`
   * @param fromCoin 
   * @param toCoin 
   * @returns Array<Route>
   */
  async getAllRoutes(fromCoin: AptosResourceType, toCoin: AptosResourceType, maxHop = 2): Promise<Array<Route>> {
    const allPairs = await this.sdk.swap.getAllPairs()
    const allRoutes = this.findAllRoutes(
      allPairs,
      toCoin,
      maxHop,
      [],
      fromCoin,
      []
    )
    return allRoutes
  }

  /**
   * Get candiate routes. Because of request rate limit, only part of routes will be request.
   * @param allRouteList 
   * @param currentBestTrade (optional) The current best Trade. The result will include this Trade coinPair
   * @param currentSecondBestTrade (optional) The current second best Trade. The result will include this Trade coinPair
   * @param maxRoutes only return `maxRoutes` items. default: DEFAULT_ROUTE
   */
  getCandidateRoutes(allRouteList: Array<Route>, currentBestTrade?: Trade, currentSecondBestTrade?: Trade, maxRoutes: number = DEFAULT_ROUTE): Array<Route> {
    if (allRouteList.length <= maxRoutes) {
      return allRouteList
    }

    const candidateRouteList: Array<Route> = []
    let randomIndexList: Array<number> = []
    let bestRoute
    let secondBestRoute
    if (currentBestTrade) {
      bestRoute = trade2Route(currentBestTrade)
    }
    if (currentSecondBestTrade) {
      secondBestRoute = trade2Route(currentSecondBestTrade)
    }
    for (let i = 0; i < allRouteList.length; i++) {
      const route = allRouteList[i]
      if (route.length == 1) {
        randomIndexList.push(i)
      } else if (bestRoute && isRouteEqual(bestRoute, route)) {
        randomIndexList.push(i)
      } else if (secondBestRoute && isRouteEqual(secondBestRoute, route)) {
        randomIndexList.push(i)
      }
    }
    randomIndexList = randomIndexList.concat(getRandomIndexFromArray(allRouteList, maxRoutes))
    randomIndexList = removeDup(randomIndexList)
    randomIndexList = randomIndexList.slice(0, maxRoutes)
    for (let i = 0; i < randomIndexList.length; i++) {
      candidateRouteList.push(allRouteList[randomIndexList[i]])
    }

    return candidateRouteList
  }

  /**
   * Get all LPCoin resource from candidate routes.
   * The functin will call rpc `fetchAccountResource` simultaneously
   * @param candidateRouteList 
   * @returns CoinPair2LiquidityPoolResource
   */
  async getAllCandidateRouteResources(candidateRouteList: Array<Route>): Promise<CoinPair2LiquidityPoolResource> {
    const { modules } = this.sdk.networkOptions
    const result: CoinPair2LiquidityPoolResource = {}
    const coinPairList: Array<CoinPair> = []
    for (let i = 0; i < candidateRouteList.length; i++) {
      const route = candidateRouteList[i]
      for (let j = 0; j < route.length; j++) {
        const coinPair = {
          coinX: route[j].coinX,
          coinY: route[j].coinY,
        }
        pushUnique(coinPairList, coinPair, isCoinPairEqual)
      }
    }

    const taskList = []
    for (let i = 0; i < coinPairList.length; i++) {
      const coinPair = coinPairList[i]

      const lpCoin = composeLP(modules.Scripts, coinPair.coinX, coinPair.coinY)
      const task = this.sdk.resources.fetchAccountResource<SwapPoolResource>(
        modules.ResourceAccountAddress,
        lpCoin
      )
      taskList.push(task)
    }

    const resources = await Promise.all(taskList)

    for (let i = 0; i < resources.length; i++) {
      const coinPair = coinPairList[i]
      const resource = resources[i]
      if (!resource) throw new Error('resource LPCoin not found')
      const lpResource = {
        coinX: coinPair.coinX,
        coinY: coinPair.coinY,
        coinXReserve: resource.data.coin_x_reserve.value,
        coinYReserve: resource.data.coin_y_reserve.value,
      }
      result[coinPair2Key(coinPair)] = lpResource
    }

    return result
  }

  bestTradeExactIn(
    candidateRouteList: Array<Route>,
    coinPair2LiquidityPoolResource: CoinPair2LiquidityPoolResource,
    coinTypeInOrigin: AptosResourceType,
    amountInOrigin: Decimal,
  ): Array<Trade> {
    const bestTrades: Array<Trade> = []
    for (let index = 0; index < candidateRouteList.length; index++) {
      const route = candidateRouteList[index]
      // init
      let currentCoinType = coinTypeInOrigin
      let currentAmountIn = amountInOrigin
      const coinPairList: Array<LiquidityPoolResource> = []
      const amountList: Array<Decimal> = [amountInOrigin]
      let flag = true
      // start route from begin
      for (let i = 0; i < route.length; i++) {
        const pair = route[i]
        const lpResource = coinPair2LiquidityPoolResource[coinPair2Key(pair)]
        if (!lpResource) throw('Internal error')
        const coinTypeOut = (pair.coinX == currentCoinType)
          ? pair.coinY
          : pair.coinX
        const [reserveIn, reserveOut] = (pair.coinX == currentCoinType)
          ? [d(lpResource.coinXReserve), d(lpResource.coinYReserve)]
          : [d(lpResource.coinYReserve), d(lpResource.coinXReserve)]
        const coinOut = getCoinOutWithFees(currentAmountIn, reserveIn, reserveOut, fee)
        if (coinOut.lt(0) || coinOut.gt(reserveOut)) {
          flag = false
          break
        }
        // prepare for next loop
        currentCoinType = coinTypeOut
        currentAmountIn = coinOut
        coinPairList.push(lpResource)
        amountList.push(currentAmountIn)
      }
      if (!flag) continue
      // route to the end
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
        DEFAULT_ROUTE,
        tradeComparator,
      )
    }
    return bestTrades
  }

  bestTradeExactOut(
    candidateRouteList: Array<Route>,
    coinPair2LiquidityPoolResource: CoinPair2LiquidityPoolResource,
    coinTypeInOrigin: AptosResourceType,
    coinTypeOutOrigin: AptosResourceType,
    amountOutOrigin: Decimal,
  ): Array<Trade> {
    const bestTrades: Array<Trade> = []
    for (let index = 0; index < candidateRouteList.length; index++) {
      const route = candidateRouteList[index]
      // init
      let currentCoinType = coinTypeOutOrigin
      let currentAmountOut = amountOutOrigin
      let coinPairList: Array<LiquidityPoolResource> = []
      let amountList: Array<Decimal> = [amountOutOrigin]
      let flag = true
      // start route from begin
      for (let i = route.length - 1; i >= 0; i--) {
        const pair = route[i]
        const lpResource = coinPair2LiquidityPoolResource[coinPair2Key(pair)]
        if (!lpResource) throw('Internal error')
        const coinTypeIn = (pair.coinX == currentCoinType)
          ? pair.coinY
          : pair.coinX
        const [reserveIn, reserveOut] = (pair.coinX == currentCoinType)
          ? [d(lpResource.coinYReserve), d(lpResource.coinXReserve)]
          : [d(lpResource.coinXReserve), d(lpResource.coinYReserve)]
        const coinIn = getCoinInWithFees(currentAmountOut, reserveOut, reserveIn, fee)
        if (coinIn.lt(0) || coinIn.gt(U64MAX)) {
          flag = false
          break
        }
        // prepare for next loop
        currentCoinType = coinTypeIn
        currentAmountOut = coinIn
        coinPairList = [lpResource, ...coinPairList]
        amountList = [currentAmountOut, ...amountList]
      }
      if (!flag) continue
      // route to the end
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
        DEFAULT_ROUTE,
        tradeComparator,
      )
    }
    return bestTrades
  }

  async getRouteSwapExactCoinForCoin({
    fromCoin,
    toCoin,
    amount,
  }: SwapCoinParams): Promise<Array<Trade>> {
    amount = d(amount)
    const allRoutes = await this.getAllRoutes(fromCoin, toCoin)
    const candidateRouteList = this.getCandidateRoutes(allRoutes)
    const allCandidateRouteResources = await this.getAllCandidateRouteResources(candidateRouteList)
    const bestTrades = this.bestTradeExactIn(
      candidateRouteList,
      allCandidateRouteResources,
      fromCoin,
      amount
    )
    return bestTrades
  }

  async getRouteSwapCoinForExactCoin({
    fromCoin,
    toCoin,
    amount,
  }: SwapCoinParams): Promise<Array<Trade>> {
    amount = d(amount)
    const allRoutes = await this.getAllRoutes(fromCoin, toCoin)
    const candidateRouteList = this.getCandidateRoutes(allRoutes)
    const allCandidateRouteResources = await this.getAllCandidateRouteResources(candidateRouteList)
    const bestTrades = this.bestTradeExactOut(
      candidateRouteList,
      allCandidateRouteResources,
      fromCoin,
      toCoin,
      amount
    )
    return bestTrades
  }
}

function pushUnique<T>(items: Array<T>, add: T, comparator: (a: T, b: T) => boolean) {
  let index
  for (index = 0; index < items.length; index++) {
    const isEqual = comparator(items[index], add)
    if (isEqual) return
  }
  items.push(add)
}

function isCoinPairEqual(a: CoinPair, b: CoinPair): boolean {
  return a.coinX == b.coinX && a.coinY == b.coinY
}

function isRouteEqual(a: Route, b: Route): boolean {
  if (a.length != b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!isCoinPairEqual(a[i], b[i])) return false
  }
  return true
}

function coinPair2Key(coinPair: CoinPair): string {
  return `${coinPair.coinX}, ${coinPair.coinY}`
}

function trade2Route(trade: Trade): Route {
  const route: Route = []
  for (let i = 0; i < trade.coinPairList.length; i++) {
    const current = trade.coinPairList[i]
    if (!current) continue
    route.push({
      coinX: current.coinX,
      coinY: current.coinY,
    })
  }
  return route
}

// Get n random index from array. return index array
function getRandomIndexFromArray<T>(items: Array<T>, n: number) : Array<number> {
  const indexList = []
  let resultIndexList: Array<number> = []
  const len = items.length
  for (let i = 0; i < len; i++) {
    indexList.push(i)
  }
  while (resultIndexList.length < n) {
    const randIndex = getRandomInt(0, len)
    if (!resultIndexList.includes(randIndex)) {
      resultIndexList.push(randIndex)
      resultIndexList = resultIndexList.slice(0, randIndex).concat(resultIndexList.slice(randIndex + 1, resultIndexList.length))
    }
  }
  return resultIndexList
}

function removeDup(items: Array<number>): Array<number> {
  const result: Array<number> = []
  for (let i = 0; i < items.length; i++) {
    if (!result.includes(items[i])) {
      result.push(items[i])
    }
  }
  return result
}
