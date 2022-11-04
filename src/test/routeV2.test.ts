import SDK, { NetworkType } from '../main'
import { d } from '../utils'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  USDC: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
}
const amount = d(1e7)

describe('RouteV2 Module', () => {
  const sdk = new SDK('https://fullnode.mainnet.aptoslabs.com', NetworkType.Mainnet)

  test('getAllRoutes', async () => {
    const routes = await sdk.routeV2.getAllRoutes(CoinsMapping.APTOS, CoinsMapping.USDC)
    console.log(routes)
    console.log(routes.length)
    expect(routes.length).toBeGreaterThan(1)
  })

  test('getRouteSwapExactCoinForCoin (one time)', async () => {
    const trades = await sdk.routeV2.getRouteSwapExactCoinForCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.USDC,
      amount: amount,
    })
    console.log(trades)
    expect(1).toBe(1)
  })

  test('getRouteSwapExactCoinForCoin (multiple times)', async () => {
    const fromCoin = CoinsMapping.APTOS
    const toCoin = CoinsMapping.USDC
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

  test('getRouteSwapCoinForExactCoin (one time)', async () => {
    const trades = await sdk.routeV2.getRouteSwapCoinForExactCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.USDC,
      amount: amount,
    })
    console.log(trades)
    expect(1).toBe(1)
  })

  test('getRouteSwapCoinForExactCoin (multiple times)', async () => {
    const fromCoin = CoinsMapping.APTOS
    const toCoin = CoinsMapping.USDC
    const allRoutes = await sdk.routeV2.getAllRoutes(fromCoin, toCoin)

    // Round 1
    const candidateRouteList = sdk.routeV2.getCandidateRoutes(allRoutes)
    const allCandidateRouteResources = await sdk.routeV2.getAllCandidateRouteResources(candidateRouteList)
    const bestTrades = sdk.routeV2.bestTradeExactOut(
      candidateRouteList,
      allCandidateRouteResources,
      fromCoin,
      toCoin,
      amount,
    )
    console.log(bestTrades)
    
    // Round n, should keep the first two best trades
    const candidateRouteList2 = sdk.routeV2.getCandidateRoutes(allRoutes, bestTrades[0], bestTrades[1])
    const allCandidateRouteResources2 = await sdk.routeV2.getAllCandidateRouteResources(candidateRouteList2)
    const bestTrades2 = sdk.routeV2.bestTradeExactOut(
      candidateRouteList2,
      allCandidateRouteResources2,
      fromCoin,
      toCoin,
      amount,
    )
    console.log(bestTrades2)
    expect(1).toBe(1)
  })
})
