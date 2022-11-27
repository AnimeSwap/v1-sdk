import { composeType, extractAddressFromType } from './contract'

const LPCoinModule = 'LPCoinV1'
const LPCoinType = 'LPCoin'
const AnimeSwapLiquidityPool = 'LiquidityPool'
const AnimeSwapAdminData = 'AdminData'
const AnimeSwapPairInfo = 'PairInfo'
const AnimeSwapEvent = 'Events'
const AnimeMasterChefLPInfo = 'LPInfo'
const AnimeMasterChefPoolInfo = 'PoolInfo'
const AnimeMasterChefUserInfo = 'UserInfo'
const AnimeMasterChefData = 'MasterChefData'
const ANIModuleName = 'AnimeCoin'
const ANIRegister = 'register_ANI'
const AutoAniUserInfo = 'UserInfo'
const AutoAniData = 'AutoANIData'

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

export function composeSwapEvent(swapScript: string, coin_x: string, coin_y: string) {
  return composeType(swapScript, AnimeSwapEvent, [coin_x, coin_y])
}

export function composeMasterChefLPList(mcScript: string) {
  return composeType(mcScript, AnimeMasterChefLPInfo)
}

export function composeMasterChefPoolInfo(mcScript: string, coinType: string) {
  return composeType(mcScript, `${AnimeMasterChefPoolInfo}<${coinType}>`)
}
  
export function composeMasterChefPoolInfoPrefix(mcScript: string) {
  return composeType(mcScript, AnimeMasterChefPoolInfo)
}

export function composeMasterChefData(mcScript: string) {
  return composeType(mcScript, AnimeMasterChefData)
}

export function composeMasterChefUserInfo(mcScript: string, coinType: string) {
  return composeType(mcScript, `${AnimeMasterChefUserInfo}<${coinType}>`)
}

export function composeMasterChefUserInfoPrefix(mcScript: string) {
  return composeType(mcScript, AnimeMasterChefUserInfo)
}

export function composeANIRegister(addressANI: string) {
  return composeType(extractAddressFromType(addressANI), ANIModuleName, ANIRegister)
}

export function composeAutoAniUserInfo(aaScript: string) {
  return composeType(aaScript, AutoAniUserInfo)
}

export function composeAutoAniData(aaScript: string) {
  return composeType(aaScript, AutoAniData)
}

