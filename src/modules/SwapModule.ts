import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  address,
  AptosCoinInfoResource,
  AptosCoinStoreResource,
  AptosEvent,
  AptosLedgerInfo,
  AptosResource,
  AptosResourceType,
  AptosTransaction,
  Payload,
} from '../types/aptos'
import {
  SwapPoolResource,
} from '../types/swap'
import { BigNumber } from '../types/common'
import {
  composeType,
  extractAddressFromType,
  isSortedSymbols,
} from '../utils/contract'
import { d, YEAR_NS } from '../utils/number'
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
  composeSwapEvent,
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
  coinFromDivCoinTo: Decimal
  coinToDivCoinFrom: Decimal
}

export type SwapPayload = {
  fromCoin: AptosResourceType
  toCoin: AptosResourceType
  fromAmount: BigNumber
  toAmount: BigNumber
  fixedCoin: 'from' | 'to'
  slippage: BigNumber
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

export type LPCoinAPYReturn = {
  apy: Decimal
  windowSeconds: Decimal
}

export type LPCoinAPYBatchReturn = {
  apys: { [key: string]: Decimal } // key: coinX, coinY
  windowSeconds: Decimal
}

export type SwapEventParams = {
  coinPair: CoinPair
  fieldName: string | 'pair_created_event' | 'mint_event' | 'burn_event' | 'swap_event' | 'sync_event' | 'flash_swap_event'
  query?: {
    start?: bigint | number
    limit?: number
  }
}

const fee = d(30)

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
    const lpType = composeLP(modules.Scripts, coinX, coinY)
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
    const lpType = composeLP(modules.Scripts, coinX, coinY)
    const lp = await this.sdk.resources.fetchAccountResource<SwapPoolResource>(modules.ResourceAccountAddress, lpType)

    if (!lp) {
      throw new Error(`LiquidityPool (${lpType}) not found`)
    }

    const coinXReserve = d(lp.data.coin_x_reserve.value)
    const coinYReserve = d(lp.data.coin_y_reserve.value)

    const [reserveX, reserveY] = [coinXReserve, coinYReserve]

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

    const args = [amountXDesired.toString(), amountYDesired.toString(), amountXMin.toString(), amountYMin.toString()]

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
    const lpCoin = composeLPCoin(modules.ResourceAccountAddress, coinX, coinY)
    const lpType = composeLP(modules.Scripts, coinX, coinY)

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

    const [reserveX, reserveY] = [coinXReserve, coinYReserve]

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

    const args = [amount.toString(), amountXMin.toString(), amountYMin.toString()]

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
    const lpType = composeLP(modules.Scripts, isSorted ? fromCoin : toCoin, isSorted ? toCoin: fromCoin)

    const lp = await this.sdk.resources.fetchAccountResource<SwapPoolResource>(
      modules.ResourceAccountAddress,
      lpType
    )

    if (!lp) {
      throw new Error(`LiquidityPool (${lpType}) not found`)
    }

    const coinXReserve = d(lp.data.coin_x_reserve.value)
    const coinYReserve = d(lp.data.coin_y_reserve.value)

    const [reserveFrom, reserveTo] = isSorted
      ? [coinXReserve, coinYReserve]
      : [coinYReserve, coinXReserve]

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

    return {
      amount: outputCoins,
      amountWithSlippage: amountWithSlippage,
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
    slippage,
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

    const args = [frontAmount.toString(), backAmount.toString()]
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
    const regexStr = `^${modules.CoinStore}<${lpCoinType}<(.+?::.+?::.+?(<.+>)?), (.+?::.+?::.+?(<.+>)?)>>$`
    const filteredResource = resources.map(resource => {
      const regex = new RegExp(regexStr, 'g')
      const regexResult = regex.exec(resource.type)
      if (!regexResult) return null
      const coinX = regexResult[1]
      const coinY = regexResult[3]
      const lpCoin = composeLPCoin(modules.ResourceAccountAddress, coinX, coinY)
      return {
        coinX,
        coinY,
        lpCoin,
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
    const pairInfoType = composePairInfo(modules.Scripts)
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
    const lpCoinType = composeLiquidityPool(modules.Scripts)
    const regexStr = `^${lpCoinType}<(.+?::.+?::.+?(<.+>)?), (.+?::.+?::.+?(<.+>)?)>$`
    const filteredResource = resources.map(resource => {
      const regex = new RegExp(regexStr, 'g')
      const regexResult = regex.exec(resource.type)
      if (!regexResult) return null
      return {
        coinX: regexResult[1],
        coinY: regexResult[3],
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
   * @param ledgerVersion? calculate apy with this version window. Default: latest
   * @returns pricePerLPCoin
   */
  async getPricePerLPCoin({
    coinX,
    coinY,
  }: CoinPair, ledgerVersion?: bigint | number): Promise<Decimal> {
    const { modules } = this.sdk.networkOptions

    const lpCoin = composeLPCoin(modules.ResourceAccountAddress, coinX, coinY)
    const lpType = composeLP(modules.Scripts, coinX, coinY)

    const task1 = this.sdk.resources.fetchAccountResource<SwapPoolResource>(
      modules.ResourceAccountAddress,
      lpType,
      ledgerVersion,
    )
    const task2 = this.sdk.resources.fetchAccountResource<AptosCoinInfoResource>(
      extractAddressFromType(lpCoin),
      composeType(modules.CoinInfo, [lpCoin]),
      ledgerVersion
    )

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

  // ledgerVersion undefined for now
  async getPricePerLPCoinBatch(ledgerVersion: bigint | number | undefined, allResources?: AptosResource<unknown>[]): Promise<{ [key: string]: Decimal }> {
    const { modules } = this.sdk.networkOptions

    if (!allResources) {
      allResources = await this.sdk.resources.fetchAccountResources<unknown>(
        modules.ResourceAccountAddress,
        ledgerVersion,
      )
    }
    if (!allResources) {
      throw new Error('resources not found')
    }

    const coinPair2SwapPoolResource: { [key: string]: Decimal } = {}
    const coinPair2LPSupply: { [key: string]: Decimal } = {}
    const coinPair2PricePerLPCoin: { [key: string]: Decimal } = {}

    const lpCoinType1 = composeLiquidityPool(modules.Scripts)
    const regexStr1 = `^${lpCoinType1}<(.+?::.+?::.+?(<.+>)?), (.+?::.+?::.+?(<.+>)?)>$`
    const lpCoinType2 = composeLPCoinType(modules.ResourceAccountAddress)
    const regexStr2 = `^${modules.CoinInfo}<${lpCoinType2}<(.+?::.+?::.+?(<.+>)?), (.+?::.+?::.+?(<.+>)?)>>$`

    allResources.forEach(resource => {
      // try parse to SwapPoolResource
      const swapPool = resource.data as SwapPoolResource
      if (swapPool?.coin_x_reserve?.value && swapPool?.coin_y_reserve?.value) {
        const regex = new RegExp(regexStr1, 'g')
        const regexResult = regex.exec(resource.type)
        if (regexResult) {
          const coinX = regexResult[1]
          const coinY = regexResult[3]
          coinPair2SwapPoolResource[`${coinX}, ${coinY}`] = d(swapPool.coin_x_reserve.value).mul(d(swapPool.coin_y_reserve.value)).sqrt()
        }
      }
      // try parse to lpSupply
      const coinInfo = resource.data as AptosCoinInfoResource
      if (coinInfo?.supply?.vec[0]?.integer?.vec[0]?.value) {
        const regex = new RegExp(regexStr2, 'g')
        const regexResult = regex.exec(resource.type)
        if (regexResult) {
          const coinX = regexResult[1]
          const coinY = regexResult[3]
          coinPair2LPSupply[`${coinX}, ${coinY}`] = d(coinInfo.supply.vec[0].integer.vec[0].value)
        }
      }
    })

    for (const key of Object.keys(coinPair2SwapPoolResource)) {
      coinPair2PricePerLPCoin[key] = coinPair2SwapPoolResource[key].div(coinPair2LPSupply[key])
    }

    return coinPair2PricePerLPCoin
  }

  /**
   * Get LPCoin apy at a given ledger verion window
   * The funciont will return apy and timestamp window
   * @param params coinPair
   * @param deltaVersion calculate apy with this version window. Default: 5000000
   * @returns [apy, queryDeltaTimestampSeconds]
   */
  async getLPCoinAPY(params: CoinPair, deltaVersion?: Decimal | string): Promise<LPCoinAPYReturn> {
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
    const apy = currentPricePerLPCoin.sub(queryPricePerLPCoin).div(queryPricePerLPCoin).mul(YEAR_NS).div(deltaTimestamp)
    return {
      apy,
      windowSeconds: deltaTimestamp.div(1e6).floor(),
    }
  }

  async getLPCoinAPYBatch(deltaVersion?: Decimal | string): Promise<LPCoinAPYBatchReturn> {
    const ledgerInfo = await this.sdk.resources.fetchLedgerInfo<AptosLedgerInfo>()
    const timestampNow = ledgerInfo.ledger_timestamp
    const currentLedgerVersion = ledgerInfo.ledger_version
    const oldestLedgerVersion = ledgerInfo.oldest_ledger_version
    const queryDeltaVersion = deltaVersion ? deltaVersion : 1e6.toString()
    const queryLedgerVersion =
      d(currentLedgerVersion).sub(queryDeltaVersion).gte(d(oldestLedgerVersion))
        ? d(currentLedgerVersion).sub(queryDeltaVersion)
        : d(oldestLedgerVersion)
    const task1 = this.getPricePerLPCoinBatch(undefined)
    const task2 = this.getPricePerLPCoinBatch(BigInt(queryLedgerVersion.toString()))
    const task3 = this.sdk.resources.fetchTransactionByVersion<AptosTransaction>(BigInt(queryLedgerVersion.toString()))
    const [coinX2coinY2DecimalCurrent, coinX2coinY2DecimalPast, txn] = await Promise.all([task1, task2, task3])
    const deltaTimestamp = d(timestampNow).sub(d(txn.timestamp))

    const coinX2coinY2APY: { [key: string]: Decimal } = {}

    for (const key of Object.keys(coinX2coinY2DecimalCurrent)) {
      const base = coinX2coinY2DecimalPast[key]
      if (base) {
        coinX2coinY2APY[key] = coinX2coinY2DecimalCurrent[key].sub(base).div(base).mul(YEAR_NS).div(deltaTimestamp)
      } else {
        coinX2coinY2APY[key] = d(NaN)
      }
    }

    return {
      apys: coinX2coinY2APY,
      windowSeconds: deltaTimestamp.div(1e6).floor(),
    }
  }

  // get events by coinPair and eventType
  async getEvents(params: SwapEventParams): Promise<AptosEvent[]> {
    const { modules } = this.sdk.networkOptions
    const eventHandleStruct = composeSwapEvent(modules.Scripts, params.coinPair.coinX, params.coinPair.coinY)

    const events = await this.sdk.resources.getEventsByEventHandle(modules.ResourceAccountAddress, eventHandleStruct, params.fieldName, params.query)
    return events
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
