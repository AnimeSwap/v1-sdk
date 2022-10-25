# AnimeSwap v1 Protocol SDK

[![Lint and Test](https://github.com/AnimeSwap/v1-sdk/actions/workflows/lint-and-test.yml/badge.svg)](https://github.com/AnimeSwap/v1-sdk/actions/workflows/lint-and-test.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@animeswap.org/v1-sdk/latest.svg)](https://img.shields.io/npm/v/@animeswap.org/v1-sdk/latest.svg)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@animeswap.org/v1-sdk/latest.svg)](https://img.shields.io/bundlephobia/minzip/@animeswap.org/v1-sdk/latest.svg)
[![downloads](https://img.shields.io/npm/dm/@animeswap.org/v1-sdk)](https://img.shields.io/npm/dm/@animeswap.org/v1-sdk)

The typescript SDK for [AnimeSwap](https://animeswap.org) v1 protocol.

* [SDK documents](https://docs.animeswap.org/docs/sdk)
* [Contracts documents](https://docs.animeswap.org/docs/contracts)

# Installation

    yarn add "@animeswap.org/v1-sdk"

# Usage Example
### Init SDK
```typescript
import { SDK } from '@animeswap.org/v1-sdk';

const sdk = new SDK('https://fullnode.devnet.aptoslabs.com', NetworkType.Devnet)
```

### Is pair exist
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'

  const output = await sdk.swap.isPairExist(APTOS, BTC)
})()
```

### Add liquidity rate calculation and tx payload.

If pair not exists, tx will create pair first

```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'

  const isPairExist = await sdk.swap.isPairExist(APTOS, BTC)

  if (isPairExist) {
    // Add liqudity with a given rate
    const amountIn = 1e8
    const output = await sdk.swap.addLiquidityRates({
      coinX: APTOS,
      coinY: BTC,
      fixedCoin: 'X', // 'X' | 'Y'
      amount: amountIn,  // fixedCoin amount
    })

    /**
      output type:
      {
        amount: Decimal
        coinXDivCoinY: Decimal
        coinYDivCoinX: Decimal
        shareOfPool: Decimal
      }
    */

    const txPayload = sdk.swap.addLiquidityPayload({
      coinX: APTOS,
      coinY: BTC,
      amountX: amountIn,
      amountY: output.amount,
      slippage: 0.05, // 5%
    })

    /**
      output type: tx payload
    */
  } else {
    // Create pair and add initial liquidity
    const txPayload = sdk.swap.addLiquidityPayload({
      coinX: APTOS,
      coinY: BTC,
      amountX: 1e8, // any amount you want
      amountY: 1e7, // any amount you want
      slippage: 0.05, // 5%
    })

    /**
      output type: tx payload
    */
  }
})()
```

### Remove liquidity rate calculation and tx payload for existed pairs
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'
  const lpAmount = 1e6

  const output = await sdk.swap.removeLiquidityRates({
    coinX: APTOS,
    coinY: BTC,
    amount: lpAmount,  // lp amount
  });

  /**
    output type:
    {
      amountX: Decimal
      amountY: Decimal
    }
   */

  const txPayload = sdk.swap.removeLiquidityPayload({
    coinX: APTOS,
    coinY: BTC,
    amount: lpAmount,
    amountXDesired: output.amountX,
    amountYDesired: output.amountY,
    slippage: 0.05, // 5%
    deadline: 30,   // 30 seconds
  })

  /**
    output type: tx payload
   */
})()
```

### Swap (exact in) rate calculation and tx payload.

Swap exact coin to coin mode

```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'
  const aptosAmount = 1e6

  const trades = await sdk.route.getRouteSwapExactCoinForCoin({
    fromCoin: APTOS,
    toCoin: BTC,
    amount: aptosAmount,
  });
  if (trades.length == 0) throw("No route error")
  const bestTrade = trades[0]
  /**
    bestTrade type:
    {
      coinPairList: LiquidityPoolResource[]
      amountList: string[]
      coinTypeList: string[]
      priceImpact: Decimal
    }
   */

  const output = sdk.route.swapExactCoinForCoinPayload({
    trade: bestTrade,
    slippage: 0.05,   // 5%
  })

  /**
    output type: tx payload
   */
})()
```

### Swap (exact out) rate calculation and tx payload.

Swap coin to exact coin mode

```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'
  const btcAmount = 1e6

  const trades = await sdk.route.getRouteSwapCoinForExactCoin({
    fromCoin: APTOS,
    toCoin: BTC,
    amount: btcAmount,
  });
  if (trades.length == 0) throw("No route error")
  const bestTrade = trades[0]
  /**
    bestTrade type:
    {
      coinPairList: LiquidityPoolResource[]
      amountList: string[]
      coinTypeList: string[]
      priceImpact: Decimal
    }
   */

  const output = sdk.route.swapCoinForExactCoinPayload({
    trade: bestTrade,
    slippage: 0.05,   // 5%
  })

  /**
    output type: tx payload
   */
})()
```

### Get all LPCoin by address
```typescript
(async () => {
  const queryAddress = '0xA11ce'
  const output = await sdk.swap.getAllLPCoinResourcesByAddress(queryAddress)

  /**
    output type:
    [{
      coinX: AptosResourceType
      coinY: AptosResourceType
      lpCoin: AptosResourceType
      value: string
    }]
   */
})()
```

### Get LPCoin amount
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'
  const queryAddress = '0xA11ce'

  const output = await sdk.swap.getLPCoinAmount({
    address: queryAddress,
    coinX: APTOS,
    coinY: BTC,
  })

  /**
    output type:
    {
      coinX: AptosResourceType
      coinY: AptosResourceType
      lpCoin: AptosResourceType
      value: string
    }
   */
})()
```

### Get LPCoin apr
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin'
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC'

  const output = await sdk.swap.getLPCoinAPY({
    coinX: APTOS,
    coinY: BTC,
  })

  /**
    output type:
    {
      apr: Decimal
      windowSeconds: Decimal
    }
   */
})()
```