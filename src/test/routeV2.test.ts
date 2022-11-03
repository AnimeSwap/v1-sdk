import SDK, { NetworkType } from '../main'
import { d } from '../utils'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  BTC: '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T',
}
const amount = d(1e8)

describe('RouteV2 Module', () => {
  const sdk = new SDK('https://fullnode.mainnet.aptoslabs.com', NetworkType.Mainnet)

  test('getAllRoutes', async () => {
    const routes = await sdk.routeV2.getAllRoutes(CoinsMapping.APTOS, CoinsMapping.BTC)
    console.log(routes)
    console.log(routes.length)
    expect(routes.length).toBeGreaterThan(1)
  })

  test('getRouteSwapExactCoinForCoin', async () => {
    const trades = await sdk.routeV2.getRouteSwapExactCoinForCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: amount,
    })
    console.log(trades)
    expect(1).toBe(1)
  })

  test('getRouteSwapExactCoinForCoin', async () => {
    const fromCoin = CoinsMapping.APTOS
    const toCoin = CoinsMapping.BTC
    const allRoutes = await sdk.routeV2.getAllRoutes(fromCoin, toCoin)

    // Round 1
    const candidateRouteList = sdk.routeV2.getCandidateRoutes(allRoutes)
    const allCandidateRouteResources = await sdk.routeV2.getAllCandidateRouteResources(candidateRouteList)
    const bestTrades = sdk.routeV2.bestTradeExactIn(
      candidateRouteList,
      allCandidateRouteResources,
      fromCoin,
      amount,
    )
    console.log(bestTrades)
    
    // Round n, should keep the first two best trades
    const candidateRouteList2 = sdk.routeV2.getCandidateRoutes(allRoutes, bestTrades[0], bestTrades[1])
    const allCandidateRouteResources2 = await sdk.routeV2.getAllCandidateRouteResources(candidateRouteList2)
    const bestTrades2 = sdk.routeV2.bestTradeExactIn(
      candidateRouteList2,
      allCandidateRouteResources2,
      fromCoin,
      amount,
    )
    console.log(bestTrades2)
    expect(1).toBe(1)
  })
})
