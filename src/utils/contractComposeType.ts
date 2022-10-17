import { composeType } from './contract'

const LPCoinModule = 'LPCoinV1'
const LPCoinType = 'LPCoin'
const AnimeSwapLiquidityPool = 'LiquidityPool'
const AnimeSwapAdminData = 'AdminData'
const AnimeSwapPairInfo = 'PairInfo'
const AnimeMasterChefModule = 'AnimeMasterChefV1'
const AnimeMasterChefLPInfo = 'LPInfo'
const AnimeMasterChefPoolInfo = 'PoolInfo'
const AnimeMasterChefUserInfo = 'UserInfo'
const AnimeMasterChefData = 'MasterChefData'

export function composeLPCoin(address: string, coin_x: string, coin_y: string) {
  return composeType(address, LPCoinModule, LPCoinType, [coin_x, coin_y])
}

export function composeLP(swapScript: string, coin_x: string, coin_y: string) {
  return composeType(swapScript, AnimeSwapLiquidityPool, [coin_x, coin_y])
}

export function composeLPCoinType(address: string) {
  return composeType(address, LPCoinModule, LPCoinType)
}

export function composeSwapPoolData(swapScript: string) {
  return composeType(swapScript, AnimeSwapAdminData)
}

export function composePairInfo(swapScript: string) {
  return composeType(swapScript, AnimeSwapPairInfo)
}

export function composeCoinStore(coinStore: string, coinType: string) {
  return `${coinStore}<${coinType}>`
}

export function composeLiquidityPool(swapScript: string) {
  return composeType(swapScript, AnimeSwapLiquidityPool)
}

export function composeMasterChefLPList(address: string) {
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
