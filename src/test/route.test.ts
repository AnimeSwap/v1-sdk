import SDK from '../main'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  BTC: '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC',
}
const SenderAddress = '0xa1ice'

describe('Route Module', () => {
  const sdk = new SDK({
    nodeUrl: 'https://fullnode.devnet.aptoslabs.com',
    networkOptions: {
      nativeCoin: '0x1::aptos_coin::AptosCoin',
      modules: {
        Scripts: '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2::AnimeSwapPoolV1',
        CoinInfo: '0x1::coin::CoinInfo',
        CoinStore: '0x1::coin::CoinStore',
        DeployerAddress: '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2',
        ResourceAccountAddress: '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2',
      },
    },
  })

  test('getRouteSwapExactCoinForCoin', async () => {
    const output = await sdk.route.getRouteSwapExactCoinForCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: '10000000',
    })
    console.log(output)
    expect(1).toBe(1)
  })

  test('swapExactCoinToCoinPayload', async () => {
    const trades = await sdk.route.getRouteSwapExactCoinForCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: '10000000',
    })
    const output = sdk.route.swapExactCoinForCoinPayload(
      CoinsMapping.APTOS,
      trades[0],
      SenderAddress,
      0.05,
      20,
    )
    console.log(output)
    expect(1).toBe(1)
  })

  test('getRouteSwapCoinForExactCoin', async () => {
    const output = await sdk.route.getRouteSwapCoinForExactCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: '10000000',
    })
    console.log(output)
    expect(1).toBe(1)
  })

  test('swapCoinForExactCoinPayload', async () => {
    const trades = await sdk.route.getRouteSwapCoinForExactCoin({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: '10000000',
    })
    const output = sdk.route.swapCoinForExactCoinPayload(
      CoinsMapping.APTOS,
      trades[0],
      SenderAddress,
      0.05,
      20,
    )
    console.log(output)
    expect(1).toBe(1)
  })
})
