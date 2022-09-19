import SDK from '../main'
import { d, decimalsMultiplier } from '../utils/number'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  BTC: '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC',
}

const SenderAddress = '0xa1ice'

const CoinInfo: { [key: string]: { decimals: number } } = {
  APTOS: { decimals: 8 },
  BTC: { decimals: 8 },
}

function convertToDecimals(amount: number | string, coin: string) {
  const mul = decimalsMultiplier(CoinInfo[coin]?.decimals || 0)

  return d(amount).mul(mul)
}

function prettyAmount(amount: number | string, coin: string) {
  const mul = decimalsMultiplier(CoinInfo[coin]?.decimals || 0)

  return d(amount).div(mul)
}

describe('Swap Module', () => {
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
        AniAddress: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78::AnimeMasterChefV1::ANI',
        MasterChefScripts: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78::AnimeMasterChefV1',
        MasterChefDeployerAddress: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78',
        MasterChefResourceAccountAddress: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78',
      },
    },
  })

  test('getAllPairs', async () => {
    const output = await sdk.swap.getAllPairs()
    console.log(output)
    expect(1).toBe(1)
  })

  test('getAllLPCoinResourcesByAddress', async () => {
    const address = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c'
    const output = await sdk.swap.getAllLPCoinResourcesByAddress(address)
    console.log(output)
    expect(1).toBe(1)
  })

  test('getAllLPCoinResourcesWithAdmin', async () => {
    const output = await sdk.swap.getAllLPCoinResourcesWithAdmin()
    console.log(output)
    expect(1).toBe(1)
  })

  test('getCoinInfo', async () => {
    const output = await sdk.swap.getCoinInfo(CoinsMapping.APTOS)
    expect(output?.data.decimals).toBe(8)
  })

  test('getLPCoinAmount', async () => {
    const output = await sdk.swap.getLPCoinAmount({
      address: sdk.networkOptions.modules.ResourceAccountAddress,
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
    })
    const value = (output?.value) as unknown as number
    expect(+value).toBeGreaterThanOrEqual(1000)
  })

  test('isPairExist', async () => {
    const output = await sdk.swap.isPairExist(CoinsMapping.APTOS, CoinsMapping.BTC)
    expect(output).toBe(true)
  })

  test('swapRates #1', async () => {
    const output = await sdk.swap.swapRates({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: convertToDecimals(1, 'APTOS'),
      fixedCoin: 'from',
      slippage: 0.05,
    })

    console.log(output)

    console.log({
      amount: output.amount,
      pretty: prettyAmount(output.amount.toString(), 'BTC'),
    })

    expect(1).toBe(1)
  })

  test('swapRates #2', async () => {
    console.log(convertToDecimals('0.00001', 'BTC'),)
    const output = await sdk.swap.swapRates({
      fromCoin: CoinsMapping.BTC,
      toCoin: CoinsMapping.APTOS,
      amount: convertToDecimals('1', 'APTOS'),
      fixedCoin: 'to',
      slippage: 0.05,
    })

    console.log(output)

    console.log({
      amount: output.amount,
      pretty: prettyAmount(output.amount.toString(), 'BTC'),
    })

    expect(1).toBe(1)
  })

  test('swapPayload (coin_to_exact_coin)', async () => {
    console.log(convertToDecimals('0.001', 'BTC'))
    const output = sdk.swap.swapPayload({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      fromAmount: convertToDecimals('0.116831', 'APTOS'),
      toAmount: convertToDecimals('0.001', 'BTC'),
      fixedCoin: 'to',
      toAddress: SenderAddress,
      slippage: 0.05,
      deadline: 20,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('swapPayload (exact_coin_to_coin)', async () => {
    console.log(convertToDecimals('1', 'APTOS'))
    const output = sdk.swap.swapPayload({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      fromAmount: convertToDecimals('1', 'APTOS'),
      toAmount: convertToDecimals('0.01584723', 'BTC'),
      fixedCoin: 'from',
      toAddress: SenderAddress,
      slippage: 0.05,
      deadline: 20,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('addLiquidityRates', async () => {
    const output = await sdk.swap.addLiquidityRates({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      fixedCoin: 'X',
      amount: convertToDecimals(1, 'APTOS'),
    })

    console.log(output)
    console.log({
      amount: output.amount,
      pretty: prettyAmount(output.amount.toString(), 'BTC'),
    })

    expect(1).toBe(1)
  })

  test('addLiquidityPayload', async () => {
    console.log(convertToDecimals('0.001', 'BTC'))
    const output = sdk.swap.addLiquidityPayload({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      amountX: convertToDecimals('0.116831', 'APTOS'),
      amountY: convertToDecimals('0.001', 'BTC'),
      slippage: 0.05,
      deadline: 20,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('removeLiquidityRates', async () => {
    const output = await sdk.swap.removeLiquidityRates({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      amount: 1000,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('removeLiquidityPayload', async () => {
    const output = sdk.swap.removeLiquidityPayload({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      amount: 1000,
      amountXDesired: convertToDecimals('0.116831', 'APTOS'),
      amountYDesired: convertToDecimals('0.001', 'BTC'),
      slippage: 0.05,
      deadline: 20,
    })

    console.log(output)

    expect(1).toBe(1)
  })
})
