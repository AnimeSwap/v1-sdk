import SDK from '../main'
import { d, decimalsMultiplier } from '../utils/numbers'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  BTC: '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::DemoTestCoinsV1::BTC',
  OTHER: '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::BTC',
}

const CoinInfo: { [key: string]: { decimals: number } } = {
  APTOS: { decimals: 6 },
  BTC: { decimals: 6 },
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
        Scripts:
          '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::DemoAnimeSwapPoolV1',
        CoinInfo: '0x1::coin::CoinInfo',
        CoinStore: '0x1::coin::CoinStore',
        DeployerAddress: '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c',
        ResourceAccountAddress: '0xab5a6ebb67f16253bf7718c53bc43a65aef150fb1040f75ad587c0ea8434d277',
      },
    },
  })

  test('getResources', async () => {
    const address = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c'
    const output = await sdk.Swap.getAllLPCoinResourcesByAddress(address)
    console.log(output)
    expect(1).toBe(1)
  })

  test('getCoinInfo', async () => {
    const output = await sdk.Swap.getCoinInfo(CoinsMapping.APTOS)
    expect(output?.data.decimals).toBe(8)
  })

  test('checkPairExist', async () => {
    const output = await sdk.Swap.checkPairExist({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
    })

    expect(output).toBe(true)
  })

  test('checkPairExist', async () => {
    const output = await sdk.Swap.checkPairExist({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.OTHER,
    })

    expect(output).toBe(false)
  })

  test('calculateRates (test 1)', async () => {
    const output = await sdk.Swap.calculateSwapRates({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: convertToDecimals(1, 'APTOS'),
      fixedCoin: 'from',
      slippage: 0.05,
    })

    console.log(output)

    console.log({
      amount: output.amount,
      pretty: prettyAmount(output.amount, 'BTC'),
    })

    expect(1).toBe(1)
  })

  test('calculateRates (test 2)', async () => {
    console.log(convertToDecimals('0.00001', 'BTC'),)
    const output = await sdk.Swap.calculateSwapRates({
      fromCoin: CoinsMapping.BTC,
      toCoin: CoinsMapping.APTOS,
      amount: convertToDecimals('1', 'APTOS'),
      fixedCoin: 'to',
      slippage: 0.05,
    })

    console.log(output)

    console.log({
      amount: output.amount,
      pretty: prettyAmount(output.amount, 'BTC'),
    })

    expect(1).toBe(1)
  })

  test('createSwapTransactionPayload (coin_to_exact_coin)', async () => {
    console.log(convertToDecimals('0.001', 'BTC'))
    const output = sdk.Swap.createSwapTransactionPayload({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      fromAmount: convertToDecimals('0.116831', 'APTOS'),
      toAmount: convertToDecimals('0.001', 'BTC'),
      fixedCoin: 'to',
      slippage: 0.05,
      deadline: 20,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('createSwapTransactionPayload (exact_coin_to_coin)', async () => {
    console.log(convertToDecimals('1', 'APTOS'))
    const output = sdk.Swap.createSwapTransactionPayload({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      fromAmount: convertToDecimals('1', 'APTOS'),
      toAmount: convertToDecimals('0.01584723', 'BTC'),
      fixedCoin: 'from',
      slippage: 0.05,
      deadline: 20,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('calculateAddLiquidityRates', async () => {
    const output = await sdk.Swap.calculateAddLiquidityRates({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      fixedCoin: 'X',
      amount: convertToDecimals(1, 'APTOS'),
    })

    console.log(output)
    console.log({
      amount: output.amount,
      pretty: prettyAmount(output.amount, 'BTC'),
    })

    expect(1).toBe(1)
  })

  test('createAddLiquidityTransactionPayload', async () => {
    console.log(convertToDecimals('0.001', 'BTC'))
    const output = sdk.Swap.createAddLiquidityTransactionPayload({
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

  test('calculateRemoveLiquidityRates', async () => {
    const output = await sdk.Swap.calculateRemoveLiquidityRates({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      amount: 1000,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('createRemoveLiquidityTransactionPayload', async () => {
    const output = sdk.Swap.createRemoveLiquidityTransactionPayload({
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
