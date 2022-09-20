import { composeType, isSortedSymbols } from './contract'

const LPCoinModule = 'LPCoinV1'
const LPCoinType = 'LPCoin'
const AnimeSwapModule = 'AnimeSwapPoolV1'
const AnimeSwapLiquidityPool = 'LiquidityPool'
const AnimeSwapAdminData = 'AdminData'
const AnimeSwapPairInfo = 'PairInfo'
const AnimeMasterChefModule = 'AnimeMasterChefV1'
const AnimeMasterChefLPInfo = 'LPInfo'
const AnimeMasterChefPoolInfo = 'PoolInfo'
const AnimeMasterChefUserInfo = 'UserInfo'
const AnimeMasterChefData = 'MasterChefData'

export function composeLPCoin(address: string, coin_x: string, coin_y: string) {
  const isSorted = isSortedSymbols(coin_x, coin_y)
  if (isSorted) {
    return composeType(address, LPCoinModule, LPCoinType, [coin_x, coin_y])
  } else {
    return composeType(address, LPCoinModule, LPCoinType, [coin_y, coin_x])
  }
}

export function composeLP(address: string, coin_x: string, coin_y: string) {
  const isSorted = isSortedSymbols(coin_x, coin_y)
  const lpCoin = composeLPCoin(address, coin_x, coin_y)
  if (isSorted) {
    return composeType(address, AnimeSwapModule, AnimeSwapLiquidityPool, [coin_x, coin_y, lpCoin])
  } else {
    return composeType(address, AnimeSwapModule, AnimeSwapLiquidityPool, [coin_y, coin_x, lpCoin])
  }
}

export function composeLPCoinType(address: string) {
  return composeType(address, LPCoinModule, LPCoinType)
}

export function composeSwapPoolData(address: string) {
  return composeType(address, AnimeSwapModule, AnimeSwapAdminData)
}

export function composePairInfo(address: string) {
  return composeType(address, AnimeSwapModule, AnimeSwapPairInfo)
}

export function composeCoinStore(coinStore: string, lpCoinType: string) {
  return `${coinStore}<${lpCoinType}>`
}

export function composeLiquidityPool(address: string) {
  return composeType(address, AnimeSwapModule, AnimeSwapLiquidityPool)
}

export function composeMasterChefLpList(address: string) {
  return composeType(address, AnimeMasterChefModule, AnimeMasterChefLPInfo)
}

export function composeMasterChefPoolInfo(address: string, coinType: string) {
  return composeType(address, AnimeMasterChefModule, `${AnimeMasterChefPoolInfo}<${coinType}>`)
}
  
export function composeMasterChefPoolInfoPrefix(address: string) {
  return composeType(address, AnimeMasterChefModule, AnimeMasterChefPoolInfo)
}

export function composeMasterChefData(address: string) {
  return composeType(address, AnimeMasterChefModule, AnimeMasterChefData)
}

export function composeMasterChefUserInfo(address: string, coinType: string) {
  return composeType(address, AnimeMasterChefModule, `${AnimeMasterChefUserInfo}<${coinType}>`)
}

export function composeMasterChefUserInfoPrefix(address: string) {
  return composeType(address, AnimeMasterChefModule, AnimeMasterChefUserInfo)
}
