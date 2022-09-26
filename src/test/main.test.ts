import SDK from '../main'
import { d, decimalsMultiplier } from '../utils/number'

const CoinsMapping: { [key: string]: string } = {
  APTOS: '0x1::aptos_coin::AptosCoin',
  BTC: '0xb8d9d622a4b32e47371a91bce42719f0a1eeb18c7bec78155b4231854ea5f538::TestCoinsV1::BTC',
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
  const sdk = new SDK('https://fullnode.devnet.aptoslabs.com')

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
    expect(Number(output)).toBeGreaterThanOrEqual(1)
  })

  test('getLPCoinAPR', async () => {
    const output = await sdk.swap.getLPCoinAPR({
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
