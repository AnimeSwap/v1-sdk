import SDK, { NetworkType } from '../main'
import { mulDecimals, divDecimals } from '../utils/number'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  BTC: '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e::coin::T',
}

const CoinInfo: { [key: string]: { decimals: number } } = {
  APTOS: { decimals: 8 },
  BTC: { decimals: 8 },
}

describe('Swap Module', () => {
  const sdk = new SDK('https://fullnode.mainnet.aptoslabs.com', NetworkType.Mainnet)

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

  test('getPricePerLPCoin', async () => {
    const output = await sdk.swap.getPricePerLPCoin({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
    })
    console.log(output)
    expect(Number(output)).toBeGreaterThanOrEqual(0)
  })

  test('getLPCoinAPR', async () => {
    const output = await sdk.swap.getLPCoinAPY({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
    }, 1e3.toString())
    console.log(output)
    expect(1).toBe(1)
  })

  test('isPairExist', async () => {
    const output = await sdk.swap.isPairExist(CoinsMapping.APTOS, CoinsMapping.BTC)
    expect(output).toBe(true)
  })

  test('swapRates #1', async () => {
    const output = await sdk.swap.swapRates({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      amount: mulDecimals(1, CoinInfo['APTOS'].decimals),
      fixedCoin: 'from',
      slippage: 0.05,
    })

    console.log(output)

    console.log({
      amount: output.amount,
      pretty: divDecimals(output.amount, CoinInfo['BTC'].decimals),
    })

    expect(1).toBe(1)
  })

  test('swapRates #2', async () => {
    console.log(mulDecimals('0.00001', CoinInfo['APTOS'].decimals))
    const output = await sdk.swap.swapRates({
      fromCoin: CoinsMapping.BTC,
      toCoin: CoinsMapping.APTOS,
      amount: mulDecimals(1, CoinInfo['APTOS'].decimals),
      fixedCoin: 'to',
      slippage: 0.05,
    })

    console.log(output)

    console.log({
      amount: output.amount,
      pretty: divDecimals(output.amount, CoinInfo['BTC'].decimals),
    })

    expect(1).toBe(1)
  })

  test('swapPayload (coin_to_exact_coin)', async () => {
    console.log(mulDecimals('0.001', CoinInfo['BTC'].decimals))
    const output = sdk.swap.swapPayload({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      fromAmount: mulDecimals('0.116831', CoinInfo['APTOS'].decimals),
      toAmount: mulDecimals('0.001', CoinInfo['BTC'].decimals),
      fixedCoin: 'to',
      slippage: 0.05,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('swapPayload (exact_coin_to_coin)', async () => {
    console.log(mulDecimals('1', CoinInfo['APTOS'].decimals))
    const output = sdk.swap.swapPayload({
      fromCoin: CoinsMapping.APTOS,
      toCoin: CoinsMapping.BTC,
      fromAmount: mulDecimals('1', CoinInfo['APTOS'].decimals),
      toAmount: mulDecimals('0.01584723', CoinInfo['BTC'].decimals),
      fixedCoin: 'from',
      slippage: 0.05,
    })

    console.log(output)

    expect(1).toBe(1)
  })

  test('addLiquidityRates', async () => {
    const output = await sdk.swap.addLiquidityRates({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      fixedCoin: 'X',
      amount:  mulDecimals(1, CoinInfo['APTOS'].decimals),
    })

    console.log(output)
    console.log({
      amount: output.amount,
      pretty:  divDecimals(output.amount, CoinInfo['BTC'].decimals),
    })

    expect(1).toBe(1)
  })

  test('addLiquidityPayload', async () => {
    console.log(mulDecimals('0.001', CoinInfo['BTC'].decimals))
    const output = sdk.swap.addLiquidityPayload({
      coinX: CoinsMapping.APTOS,
      coinY: CoinsMapping.BTC,
      amountX: mulDecimals('0.116831', CoinInfo['APTOS'].decimals),
      amountY: mulDecimals('0.001', CoinInfo['BTC'].decimals),
      slippage: 0.05,
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
      amountXDesired: mulDecimals('0.116831', CoinInfo['APTOS'].decimals),
      amountYDesired: mulDecimals('0.001', CoinInfo['BTC'].decimals),
      slippage: 0.05,
    })

    console.log(output)

    expect(1).toBe(1)
  })
})
