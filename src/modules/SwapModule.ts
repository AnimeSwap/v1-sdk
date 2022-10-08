import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  address,
  AptosCoinInfoResource,
  AptosCoinStoreResource,
  AptosLedgerInfo,
  AptosResourceType,
  AptosTransaction,
  Payload,
} from '../types/aptos'
import {
  SwapPoolResource,
  SwapPoolData,
} from '../types/swap'
import { BigNumber } from '../types/common'
import {
  composeType,
  extractAddressFromType,
  isSortedSymbols,
} from '../utils/contract'
import { d, secondsToDeadline } from '../utils/number'
import Decimal from 'decimal.js'
import { hexToString } from '../utils/hex'
import { notEmpty } from '../utils/is'
import {
  composeCoinStore,
  composeLiquidityPool,
  composeLP,
  composeLPCoin,
  composeLPCoinType,
  composePairInfo,
  composeSwapPoolData,
} from '../utils/contractComposeType'

export type AddLiquidityParams = {
  coinX: AptosResourceType
  coinY: AptosResourceType
  amount: BigNumber
  fixedCoin: 'X' | 'Y'
}

export type AddLiquidityReturn = {
  amount: Decimal
  coinXDivCoinY: Decimal
  coinYDivCoinX: Decimal
  shareOfPool: Decimal
}

export type AddLiquidityPayload = {
  coinX: AptosResourceType
  coinY: AptosResourceType
  amountX: BigNumber
  amountY: BigNumber
  slippage: BigNumber
  deadline: BigNumber // minutes
}

export type RemoveLiquidityParams = {
  coinX: AptosResourceType
  coinY: AptosResourceType
  amount: BigNumber
}

export type RemoveLiquidityReturn = {
  amountX: Decimal
  amountY: Decimal
}

export type RemoveLiquidityPayload = {
  coinX: AptosResourceType
  coinY: AptosResourceType
  amount: BigNumber
  amountXDesired: BigNumber
  amountYDesired: BigNumber
  slippage: BigNumber
  deadline: BigNumber // minutes
}

export type SwapRatesParams = {
  fromCoin: AptosResourceType
  toCoin: AptosResourceType
  amount: BigNumber
  fixedCoin: 'from' | 'to'
  slippage: BigNumber
}

export type SwapRatesReturn = {
  amount: Decimal
  amountWithSlippage: Decimal
  priceImpact: Decimal
  coinFromDivCoinTo: Decimal
  coinToDivCoinFrom: Decimal
}

export type SwapPayload = {
  fromCoin: AptosResourceType
  toCoin: AptosResourceType
  fromAmount: BigNumber
  toAmount: BigNumber
  fixedCoin: 'from' | 'to'
  toAddress: AptosResourceType
  slippage: BigNumber
  deadline: BigNumber // minutes
}

export type LPCoinResource = {
  coinX: AptosResourceType
  coinY: AptosResourceType
  lpCoin: AptosResourceType
  value: string
} | null

export type LiquidityPoolResource = {
  coinX: AptosResourceType
  coinY: AptosResourceType
  coinXReserve: string
  coinYReserve: string
} | null

export type LPCoinParams = {
  address: address
  coinX: AptosResourceType
  coinY: AptosResourceType
}

export type PairListResource = [{
  coin_x: {
    account_address: string
    module_name: string
    struct_name: string
  }
  coin_y: {
    account_address: string
    module_name: string
    struct_name: string
  }
  lp_coin: {
    account_address: string
    module_name: string
    struct_name: string
  }
}]

export type CoinPair = {
  coinX: AptosResourceType
  coinY: AptosResourceType
}

export type PairInfoResource = {
  pair_created_event: AptosResourceType
  pair_list: PairListResource
}

export type LPCoinAPRReturn = {
  apr: Decimal
  windowSeconds: Decimal
}

export class SwapModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  /**
   * Check if pair exists
   * @param coinX coinX
   * @param coinY coinY
   * @returns if pair exists
   */
  async isPairExist(coinX: AptosResourceType, coinY: AptosResourceType): Promise<boolean> {
    const { modules } = this.sdk.networkOptions
    const lpType = composeLP(modules.DeployerAddress, modules.ResourceAccountAddress, coinX, coinY)
    try {
      await this.sdk.resources.fetchAccountResource<SwapPoolResource>(modules.ResourceAccountAddress, lpType)
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Add liqudity rate, given CoinX, CoinY, fixedCoin and fixedCoin Amount, the function will return meta such as: the other CoinAmount, shareOfPool
   * @param params AddLiquidityParams
   * @returns 
   */
  async addLiquidityRates({
    coinX,
    coinY,
    amount,
    fixedCoin,
  }: AddLiquidityParams): Promise<AddLiquidityReturn> {
    amount = d(amount)

    const { modules } = this.sdk.networkOptions
    const isSorted = isSortedSymbols(coinX, coinY)
    const lpType = composeLP(modules.DeployerAddress, modules.ResourceAccountAddress, coinX, coinY)
    const lp = await this.sdk.resources.fetchAccountResource<SwapPoolResource>(modules.ResourceAccountAddress, lpType)

    if (!lp) {
      throw new Error(`LiquidityPool (${lpType}) not found`)
    }

    const coinXReserve = d(lp.data.coin_x_reserve.value)
    const coinYReserve = d(lp.data.coin_y_reserve.value)

    const [reserveX, reserveY] = isSorted
      ? [coinXReserve, coinYReserve]
      : [coinYReserve, coinXReserve]

    const outputAmount =
      fixedCoin == 'X'
        ? quote(amount, reserveX, reserveY)
        : quote(amount, reserveY, reserveX)

    return {
      amount: outputAmount,
      coinXDivCoinY: reserveX.div(reserveY),
      coinYDivCoinX: reserveY.div(reserveX),
      shareOfPool: amount.div(reserveX.add(amount)),
    }
  }

  addLiquidityPayload({
    coinX,
    coinY,
    amountX,
    amountY,
    slippage,
    deadline,
  }: AddLiquidityPayload): Payload {
    amountX = d(amountX)
    amountY = d(amountY)
    slippage = d(slippage)

    if (slippage.gte(1) || slippage.lte(0)) {
      throw new Error(`Invalid slippage (${slippage}) value`)
    }

    const { modules } = this.sdk.networkOptions
    const functionName = composeType(modules.Scripts, 'add_liquidity_entry')
    const typeArguments = [
      coinX,
      coinY,
    ]
    const amountXDesired = amountX
    const amountYDesired = amountY
    const amountXMin = withSlippage(amountX, slippage, 'minus')
    const amountYMin = withSlippage(amountY, slippage, 'minus')

    const deadlineTimestamp = secondsToDeadline(deadline)

    const args = [amountXDesired.toString(), amountYDesired.toString(), amountXMin.toString(), amountYMin.toString(), deadlineTimestamp.toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: typeArguments,
      arguments: args,
    }
  }

  /**
   * Remove liqudity rate, given CoinX, CoinY, LPCoin Amount, the function will return meta such as: amountX, amountY
   * @param params RemoveLiquidityParams
   * @returns 
   */
  async removeLiquidityRates({
    coinX,
    coinY,
    amount,
  }: RemoveLiquidityParams): Promise<RemoveLiquidityReturn> {
    amount = d(amount)

    const { modules } = this.sdk.networkOptions
    const isSorted = isSortedSymbols(coinX, coinY)
    const lpCoin = composeLPCoin(modules.ResourceAccountAddress, coinX, coinY)
    const lpType = composeLP(modules.DeployerAddress, modules.ResourceAccountAddress, coinX, coinY)

    const task1 = this.sdk.resources.fetchAccountResource<SwapPoolResource>(
      modules.ResourceAccountAddress,
      lpType
    )
    const task2 = this.getCoinInfo(lpCoin)

    const [lp, lpCoinInfo] = await Promise.all([task1, task2])
    if (!lp) {
      throw new Error(`LiquidityPool (${lpType}) not found`)
    }
    if (!lpCoinInfo) {
      throw new Error(`LpCoin (${lpCoin}) not found`)
    }

    const lpSupply = d(lpCoinInfo.data.supply.vec[0].integer.vec[0].value) // lp total supply
    if (amount.gt(lpSupply)) {
      throw new Error(`Invalid amount (${amount}) value, larger than total lpCoin supply`)
    }

    const coinXReserve = d(lp.data.coin_x_reserve.value)
    const coinYReserve = d(lp.data.coin_y_reserve.value)

    const [reserveX, reserveY] = isSorted
      ? [coinXReserve, coinYReserve]
      : [coinYReserve, coinXReserve]

    const coinXout = amount.mul(reserveX).div(lpSupply).floor()
    const coinYout = amount.mul(reserveY).div(lpSupply).floor()

    return {
      amountX: coinXout,
      amountY: coinYout,
    }
  }

  removeLiquidityPayload({
    coinX,
    coinY,
    amount,
    amountXDesired,
    amountYDesired,
    slippage,
    deadline,
  }: RemoveLiquidityPayload): Payload {
    amount = d(amount)
    amountXDesired = d(amountXDesired)
    amountYDesired = d(amountYDesired)
    slippage = d(slippage)

    if (slippage.gte(1) || slippage.lte(0)) {
      throw new Error(`Invalid slippage (${slippage}) value`)
    }
    const { modules } = this.sdk.networkOptions
    const functionName = composeType(modules.Scripts, 'remove_liquidity_entry')

    const typeArguments = [coinX, coinY]

    const amountXMin = withSlippage(amountXDesired, slippage, 'minus')
    const amountYMin = withSlippage(amountYDesired, slippage, 'minus')

    const deadlineTimestamp = secondsToDeadline(deadline)

    const args = [amount.toString(), amountXMin.toString(), amountYMin.toString(), deadlineTimestamp.toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: typeArguments,
      arguments: args,
    }
  }

  /**
   * @deprecated Should use `RouteModule.getRouteSwapExactCoinForCoin` or `RouteModule.getRouteSwapCoinForExactCoin` instead
   * Calculate direct 2 pair swap rate.
   * @param params 
   * @returns 
   */
  async swapRates({
    fromCoin,
    toCoin,
    amount,
    fixedCoin,
    slippage,
  }: SwapRatesParams): Promise<SwapRatesReturn> {
    amount = d(amount)
    slippage = d(slippage)

    const { modules } = this.sdk.networkOptions
    const isSorted = isSortedSymbols(fromCoin, toCoin)
    const lpType = composeLP(modules.DeployerAddress, modules.ResourceAccountAddress, fromCoin, toCoin)
    const swapPoolDataType = composeSwapPoolData(modules.DeployerAddress)

    const task1 = this.sdk.resources.fetchAccountResource<SwapPoolResource>(
      modules.ResourceAccountAddress,
      lpType
    )

    const task2 = this.sdk.resources.fetchAccountResource<SwapPoolData>(
      modules.ResourceAccountAddress,
      swapPoolDataType
    )

    const [lp, swapPoolData] = await Promise.all([task1, task2])

    if (!lp) {
      throw new Error(`LiquidityPool (${lpType}) not found`)
    }
    if (!swapPoolData) {
      throw new Error(`SwapPoolData (${swapPoolDataType}) not found`)
    }

    const coinXReserve = d(lp.data.coin_x_reserve.value)
    const coinYReserve = d(lp.data.coin_y_reserve.value)

    const [reserveFrom, reserveTo] = isSorted
      ? [coinXReserve, coinYReserve]
      : [coinYReserve, coinXReserve]

    const fee = d(swapPoolData.data.swap_fee)

    const outputCoins =
      isSorted
        ? getCoinOutWithFees(amount, reserveFrom, reserveTo, fee)
        : getCoinInWithFees(amount, reserveFrom, reserveTo, fee)

    const amountWithSlippage = fixedCoin == 'from'
      ? withSlippage(outputCoins, slippage, 'minus')
      : withSlippage(outputCoins, slippage, 'plus')

    const coinFromDivCoinTo = isSorted
      ? amount.div(outputCoins)
      : outputCoins.div(amount)
    const coinToDivCoinFrom = isSorted
      ? outputCoins.div(amount)
      : amount.div(outputCoins)

    const reserveFromDivReserveTo = reserveFrom.div(reserveTo)
    const reserveToDivReserveFrom = reserveTo.div(reserveFrom)

    const priceImpact = isSorted
      ? coinFromDivCoinTo.sub(reserveFromDivReserveTo).div(reserveFromDivReserveTo)
      : reserveToDivReserveFrom.sub(coinToDivCoinFrom).div(reserveToDivReserveFrom)

    return {
      amount: outputCoins,
      amountWithSlippage: amountWithSlippage,
      priceImpact: priceImpact,
      coinFromDivCoinTo: coinFromDivCoinTo,
      coinToDivCoinFrom: coinToDivCoinFrom,
    }
  }

  swapPayload({
    fromCoin,
    toCoin,
    fromAmount,
    toAmount,
    fixedCoin,
    toAddress,
    slippage,
    deadline,
  }: SwapPayload): Payload {
    fromAmount = d(fromAmount)
    toAmount = d(toAmount)
    slippage = d(slippage)

    if (slippage.gte(1) || slippage.lte(0)) {
      throw new Error(`Invalid slippage (${slippage}) value`)
    }

    const { modules } = this.sdk.networkOptions

    const functionName = composeType(
      modules.Scripts,
      fixedCoin === 'from' ? 'swap_exact_coins_for_coins_entry' : 'swap_coins_for_exact_coins_entry'
    )

    const typeArguments = [fromCoin, toCoin]

    const frontAmount = fixedCoin === 'from' ? fromAmount : toAmount
    const backAmount = fixedCoin === 'to'
      ? withSlippage(fromAmount, slippage, 'plus')
      : withSlippage(toAmount, slippage, 'minus')

    const deadlineTimestamp = secondsToDeadline(deadline)
    const args = [frontAmount.toString(), backAmount.toString(), toAddress, deadlineTimestamp.toString()]
    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: typeArguments,
      arguments: args,
    }
  }

  async getCoinInfo(coin: AptosResourceType) {
    const { modules } = this.sdk.networkOptions
    const coinInfo = await this.sdk.resources.fetchAccountResource<AptosCoinInfoResource>(
      extractAddressFromType(coin),
      composeType(modules.CoinInfo, [coin])
    )
    return coinInfo
  }

  /**
   * The function will return all LPCoin with a given address
   * @param address 
   * @returns 
   */
  async getAllLPCoinResourcesByAddress(address: address): Promise<LPCoinResource[]> {
    const { modules } = this.sdk.networkOptions
    const resources = await this.sdk.resources.fetchAccountResources<AptosCoinStoreResource>(
      address
    )
    if (!resources) {
      throw new Error('resources not found')
    }
    const lpCoinType = composeLPCoinType(modules.ResourceAccountAddress)
    const regexStr = `^${modules.CoinStore}<(${lpCoinType}<(.+), ?(.+)>)>$`
    const filteredResource = resources.map(resource => {
      const regex = new RegExp(regexStr, 'g')
      const regexResult = regex.exec(resource.type)
      if (!regexResult) return null
      return {
        coinX: regexResult[2],
        coinY: regexResult[3],
        lpCoin: regexResult[1],
        value: resource.data.coin.value,
      }
    }).filter(notEmpty)
    if (!filteredResource) {
      throw new Error(`filteredResource (${filteredResource}) not found`)
    }
    return filteredResource
  }

  /**
   * The function will return LPCoin amount with a given address and LPCoin pair
   * @param params 
   * @returns 
   */
  async getLPCoinAmount({
    address,
    coinX,
    coinY,
  }: LPCoinParams): Promise<LPCoinResource> {
    const { modules } = this.sdk.networkOptions
    const lpCoin = composeLPCoin(modules.ResourceAccountAddress, coinX, coinY)
    const coinStoreLP = composeCoinStore(modules.CoinStore, lpCoin)
    const lpCoinStore = await this.sdk.resources.fetchAccountResource<AptosCoinStoreResource>(address, coinStoreLP)
    if (!lpCoinStore) {
      throw new Error(`LPCoin (${coinStoreLP}) not found`)
    }
    return {
      coinX: coinX,
      coinY: coinY,
      lpCoin: lpCoin,
      value: lpCoinStore.data.coin.value,
    }
  }

  /**
   * The function will return all pairs created in AnimeSwap, with CoinX and CoinY full name
   * @returns all pairs
   */
  async getAllPairs(): Promise<CoinPair[]> {
    const { modules } = this.sdk.networkOptions
    const pairInfoType = composePairInfo(modules.DeployerAddress)
    const pairInfo = await this.sdk.resources.fetchAccountResource<PairInfoResource>(
      modules.ResourceAccountAddress,
      pairInfoType,
    )
    if (!pairInfo) {
      throw new Error(`PairInfo (${pairInfoType}) not found`)
    }
    const pairList = pairInfo.data.pair_list
    const ret = pairList.map(v => {
      return {
        coinX: `${v.coin_x.account_address}::${hexToString(v.coin_x.module_name)}::${hexToString(v.coin_x.struct_name)}`,
        coinY: `${v.coin_y.account_address}::${hexToString(v.coin_y.module_name)}::${hexToString(v.coin_y.struct_name)}`,
      }
    })
    return ret
  }

  /**
   * The function will return all pairs created in AnimeSwap, with coin full name and reserve meta
   * @returns 
   */
  async getAllLPCoinResourcesWithAdmin(): Promise<LiquidityPoolResource[]> {
    const { modules } = this.sdk.networkOptions
    const resources = await this.sdk.resources.fetchAccountResources<SwapPoolResource>(
      modules.ResourceAccountAddress
    )
    if (!resources) {
      throw new Error('resources not found')
    }
    const lpCoinType = composeLiquidityPool(modules.DeployerAddress)
    const regexStr = `^${lpCoinType}<(.+?), ?(.+?), ?(.+)>$`
    const filteredResource = resources.map(resource => {
      const regex = new RegExp(regexStr, 'g')
      const regexResult = regex.exec(resource.type)
      if (!regexResult) return null
      return {
        coinX: regexResult[1],
        coinY: regexResult[2],
        coinXReserve: resource.data.coin_x_reserve.value,
        coinYReserve: resource.data.coin_y_reserve.value,
      }
    }).filter(notEmpty)
    if (!filteredResource) {
      throw new Error(`filteredResource (${filteredResource}) not found`)
    }
    return filteredResource
  }

  /**
   * Get price per LPCoin at a given ledger version
   * The pricePerLPCoin of a new created LPCoin should be equal to `1`, and will increate when getting swap fee
   * @param params coinPair
   * @param ledgerVersion? calculate apr with this version window. Default: latest
   * @returns pricePerLPCoin
   */
  async getPricePerLPCoin({
    coinX,
    coinY,
  }: CoinPair, ledgerVersion?: bigint | number): Promise<Decimal> {
    const { modules } = this.sdk.networkOptions

    const lpCoin = composeLPCoin(modules.ResourceAccountAddress, coinX, coinY)
    const lpType = composeLP(modules.DeployerAddress, modules.ResourceAccountAddress, coinX, coinY)

    const task1 = this.sdk.resources.fetchAccountResource<SwapPoolResource>(
      modules.ResourceAccountAddress,
      lpType,
      ledgerVersion,
    )
    const task2 = this.getCoinInfo(lpCoin)

    const [lp, lpCoinInfo] = await Promise.all([task1, task2])
    if (!lp) {
      throw new Error(`LiquidityPool (${lpType}) not found`)
    }
    if (!lpCoinInfo) {
      throw new Error(`LpCoin (${lpCoin}) not found`)
    }

    const lpSupply = lpCoinInfo.data.supply.vec[0].integer.vec[0].value // lp total supply
    const pricePerLPCoin = d(lp.data.coin_x_reserve.value).mul(d(lp.data.coin_y_reserve.value)).sqrt().div(d(lpSupply))
    return pricePerLPCoin
  }

  /**
   * Get LPCoin apr at a given ledger verion window
   * The funciont will return apr and timestamp window
   * @param params coinPair
   * @param deltaVersion? calculate apr with this version window. Default: 5000000
   * @returns [apr, queryDeltaTimestampSeconds]
   */
  async getLPCoinAPR(params: CoinPair, deltaVersion?: string): Promise<LPCoinAPRReturn> {
    const ledgerInfo = await this.sdk.resources.fetchLedgerInfo<AptosLedgerInfo>()
    const timestampNow = ledgerInfo.ledger_timestamp
    const currentLedgerVersion = ledgerInfo.ledger_version
    const oldestLedgerVersion = ledgerInfo.oldest_ledger_version
    const queryDeltaVersion = deltaVersion ? deltaVersion : 5e6.toString()
    const queryLedgerVersion =
      d(currentLedgerVersion).sub(queryDeltaVersion).gte(d(oldestLedgerVersion))
        ? d(currentLedgerVersion).sub(queryDeltaVersion)
        : d(oldestLedgerVersion)

    const task1 = this.getPricePerLPCoin(params)
    const task2 = this.getPricePerLPCoin(params, BigInt(queryLedgerVersion.toString()))
    const task3 = this.sdk.resources.fetchTransactionByVersion<AptosTransaction>(BigInt(queryLedgerVersion.toString()))
    const [currentPricePerLPCoin, queryPricePerLPCoin, txn] = await Promise.all([task1, task2, task3])
    const deltaTimestamp = d(timestampNow).sub(d(txn.timestamp))
    const apr = currentPricePerLPCoin.sub(queryPricePerLPCoin).div(queryPricePerLPCoin).mul(365 * 86400 * 1000 * 1000).div(deltaTimestamp)
    return {
      apr,
      windowSeconds: deltaTimestamp.div(1000000).floor(),
    }
  }
}

export function getCoinOutWithFees(
  coinInVal: Decimal,
  reserveInSize: Decimal,
  reserveOutSize: Decimal,
  fee: Decimal,
) {
  const { feePct, feeScale } = { feePct: fee, feeScale: d(10000) }
  const feeMultiplier = feeScale.sub(feePct)
  const coinInAfterFees = coinInVal.mul(feeMultiplier)
  const newReservesInSize = reserveInSize.mul(feeScale).plus(coinInAfterFees)

  return coinInAfterFees.mul(reserveOutSize).div(newReservesInSize).floor()
}

export function getCoinInWithFees(
  coinOutVal: Decimal,
  reserveOutSize: Decimal,
  reserveInSize: Decimal,
  fee: Decimal,
) {
  const { feePct, feeScale } = { feePct: fee, feeScale: d(10000) }
  const feeMultiplier = feeScale.sub(feePct)
  const newReservesOutSize = reserveOutSize.sub(coinOutVal).mul(feeMultiplier)

  return coinOutVal.mul(feeScale).mul(reserveInSize).div(newReservesOutSize).plus(1).floor()
}

export function withSlippage(value: Decimal, slippage: Decimal, mode: 'plus' | 'minus') {
  const amountWithSlippage = value[mode](value.mul(slippage))
  return mode === 'plus' ? amountWithSlippage.ceil() : amountWithSlippage.floor()
}

function quote(
  amountX: Decimal,
  reserveX: Decimal,
  reserveY: Decimal,
) {
  return amountX.mul(reserveY).div(reserveX).floor()
}
