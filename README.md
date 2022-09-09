# AnimeSwap v1 Protocol SDK

[![Lint and Test](https://github.com/AnimeSwap/v1-sdk/actions/workflows/lint-and-test.yml/badge.svg)](https://github.com/AnimeSwap/v1-sdk/actions/workflows/lint-and-test.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@animeswap.org/v1-sdk/latest.svg)](https://img.shields.io/npm/v/@animeswap.org/v1-sdk/latest.svg)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@animeswap.org/v1-sdk/latest.svg)](https://img.shields.io/bundlephobia/minzip/@animeswap.org/v1-sdk/latest.svg)
[![downloads](https://img.shields.io/npm/dm/@animeswap.org/v1-sdk)](https://img.shields.io/npm/dm/@animeswap.org/v1-sdk)

The typescript SDK for [AnimeSwap](https://animeswap.org) v1 protocol.

[SDK documents](https://docs.animeswap.org)

# Installation

    yarn add @animeswap/v1-sdk

# Usage Example
### Init SDK
```typescript
import { SDK } from '@animeswap/v1-sdk';

const sdk = new SDK({
  nodeUrl: 'https://fullnode.devnet.aptoslabs.com', // Node URL
  networkOptions: {
    nativeToken: '0x1::test_coin::TestCoin', // Type of Native network token
    modules: {
      Scripts:
        '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::DemoAnimeSwapPoolV1', // This module is used for Swap
      CoinInfo: '0x1::coin::CoinInfo', // Type of base CoinInfo module
      CoinStore: '0x1::coin::CoinStore', // Type of base CoinStore module
      DeployerAddress: '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c',  // Swap deployer address
      ResourceAccountAddress: '0xab5a6ebb67f16253bf7718c53bc43a65aef150fb1040f75ad587c0ea8434d277', // Swap resource account address
    },
  }
})
```

### Check whether pair exist
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin';
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC';

  const output = await sdk.swap.checkPairExist({
    coinX: APTOS,
    coinY: BTC,
  })

  /**
    output type: bool
   */
})()
```

### Add liquidity rate calculation and tx payload for existed pairs
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin';
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC';
  const amountIn = 1e8;

  const output = await sdk.swap.calculateAddLiquidityRates({
    coinX: APTOS,
    coinY: BTC,
    fixedCoin: 'X', // 'X' | 'Y'
    amount: amountIn,  // fixedCoin amount
  });

  /**
    output type:
    {
      amount: string
      coinXDivCoinY: string
      coinYDivCoinX: string
      shareOfPool: string
    }
   */

  const txPayload = sdk.swap.createAddLiquidityTransactionPayload({
    coinX: CoinsMapping.APTOS,
    coinY: CoinsMapping.BTC,
    amountX: amountIn,
    amountY: output.amount,
    slippage: 0.05, // 5%
    deadline: 20,   // 20 minutes
  })

  /**
    output type: tx payload
   */
})()
```

### Remove liquidity rate calculation and tx payload for existed pairs
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin';
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC';
  const lpAmount = 1e6;

  const output = await sdk.swap.calculateRemoveLiquidityRates({
    coinX: APTOS,
    coinY: BTC,
    amount: lpAmount,  // lp amount
  });

  /**
    output type:
    {
      amountX: string
      amountY: string
    }
   */

  const txPayload = sdk.swap.createRemoveLiquidityTransactionPayload({
    coinX: APTOS,
    coinY: BTC,
    amount: lpAmount,
    amountXDesired: output.amountX,
    amountYDesired: output.amountY,
    slippage: 0.05, // 5%
    deadline: 20,   // 20 minutes
  })

  /**
    output type: tx payload
   */
})()
```

### Swap (exact in) rate calculation and tx payload. Swap exact coin to coin mode
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin';
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC';
  const aptosAmount = 1e6;

  const output = await sdk.swap.calculateSwapRates({
    fromCoin: APTOS,
    toCoin: BTC,
    amount: aptosAmount,
    fixedCoin: 'from',  // fixed input coin
    slippage: 0.05,     // 5%
  });

  /**
    output type:
    {
      amount: string
      amountWithSlippage: string
      priceImpact: string
      coinFromDivCoinTo: string
      coinToDivCoinFrom: string
    }
   */

  const txPayload = sdk.swap.createSwapTransactionPayload({
    fromCoin: APTOS,
    toCoin: BTC,
    fromAmount: aptosAmount,
    toAmount: output.amount,
    fixedCoin: 'from',  // fixed input coin
    slippage: 0.05,     // 5%
    deadline: 20,       // 20 minutes
  })

  /**
    output type: tx payload
   */
})()
```


### Swap (exact out) rate calculation and tx payload. Swap coin to exact coin mode
```typescript
(async () => {
  const APTOS = '0x1::aptos_coin::AptosCoin';
  const BTC = '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC';
  const btcAmount = 1e6;

  const output = await sdk.swap.calculateSwapRates({
    fromCoin: APTOS,
    toCoin: BTC,
    amount: btcAmount,
    fixedCoin: 'to',  // fixed output coin
    slippage: 0.05,   // 5%
  });

  /**
    output type:
    {
      amount: string
      amountWithSlippage: string
      priceImpact: string
      coinFromDivCoinTo: string
      coinToDivCoinFrom: string
    }
   */

  const txPayload = sdk.swap.createSwapTransactionPayload({
    fromCoin: APTOS,
    toCoin: BTC,
    fromAmount: output.amount,
    toAmount: btcAmount,
    fixedCoin: 'to',  // fixed output coin
    slippage: 0.05,   // 5%
    deadline: 20,     // 20 minutes
  })

  /**
    output type: tx payload
   */
})()
```
