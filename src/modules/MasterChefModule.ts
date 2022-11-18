import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  composeMasterChefPoolInfo,
  composeMasterChefPoolInfoPrefix,
  composeMasterChefLPList,
  composeMasterChefData,
  composeMasterChefUserInfo,
  composeMasterChefUserInfoPrefix,
  composeLPCoin,
  composeLP,
  composeCoinStore,
  composeANIRegister,
} from '../utils/contractComposeType'
import {
  AptosCoinInfoResource,
  AptosCoinStoreResource,
  AptosResourceType,
  AptosTypeInfo,
  Payload,
} from '../types/aptos'
import { hexToString } from '../utils/hex'
import {
  MasterChefData,
  MasterChefLPInfo,
  MasterChefPoolInfo,
  MasterChefUserInfo,
} from '../types/masterchef'
import { notEmpty } from '../utils/is'
import Decimal from 'decimal.js'
import { d, YEAR_S } from '../utils/number'
import { composeType } from '../utils'
import { CoinPair } from './SwapModule'
import { SwapPoolResource } from '../main'

export type PoolInfReturn = {
  coinType: AptosResourceType
  poolInfo: MasterChefPoolInfo
}

export type UserInfoReturn = {
  amount: Decimal
  pendingAni: Decimal
}

export type AllUserInfoReturn = [{
  coinType: AptosResourceType
  userInfo: UserInfoReturn
}]

export type StakeLPCoinPayload = {
  amount: AptosResourceType
  coinType: AptosResourceType
  method: 'deposit' | 'withdraw'
}

export type StakeANIPayload = {
  amount: AptosResourceType
  method: 'enter_staking' | 'leave_staking'
}

export type StakedLPInfo = {
  apr: Decimal      // staked apr
  lpAmount: Decimal // staked amount
  lp2AniAmount: Decimal // staked LP to ANI amount
  coinX?: Decimal   // staked coinX amount
  coinY?: Decimal   // staked coinY amount
}

const ACC_ANI_PRECISION = 1e12

export class MasterChefModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  /**
   * Get all staked LP list
   * @returns coinType list
   */
  async getLPInfoResources(): Promise<Array<AptosResourceType>> {
    const { modules } = this.sdk.networkOptions
    const lpList = composeMasterChefLPList(modules.MasterChefScripts)
    const resource = await this.sdk.resources.fetchAccountResource<MasterChefLPInfo>(
      modules.MasterChefResourceAccountAddress,
      lpList,
    )
    if (!resource) {
      throw new Error(`resource (${lpList}) not found`)
    }
    const aptosTypeInfoList = resource.data.lp_list
    return aptosTypeInfoList.map(v => {
      return aptosTypeInfo2AptosResourceType(v)
    })
  }

  /**
   * Get pool info by coinType
   * @param coinType coinType
   * @returns MasterChefPoolInfo
   */
  async getPoolInfoByCoinType(coinType: AptosResourceType): Promise<MasterChefPoolInfo> {
    const { modules } = this.sdk.networkOptions
    const poolInfoType = composeMasterChefPoolInfo(modules.MasterChefScripts, coinType)
    const resource = await this.sdk.resources.fetchAccountResource<MasterChefPoolInfo>(
      modules.MasterChefResourceAccountAddress,
      poolInfoType,
    )
    if (!resource) {
      throw new Error(`resource (${poolInfoType}) not found`)
    }
    return resource.data
  }

  /**
   * Get all Pool info list
   * @returns PoolInfReturn list
   */
  async getAllPoolInfo(): Promise<Array<PoolInfReturn>> {
    const { modules } = this.sdk.networkOptions
    const resources = await this.sdk.resources.fetchAccountResources<MasterChefPoolInfo>(
      modules.MasterChefResourceAccountAddress,
    )
    if (!resources) {
      throw new Error('resources not found')
    }
    const lpCoinTypePrefix = composeMasterChefPoolInfoPrefix(modules.MasterChefScripts)
    const regexStr = `^${lpCoinTypePrefix}<(.+)>$`
    const filteredResource = resources.map(resource => {
      if (!resource.type.includes(lpCoinTypePrefix)) return null
      const regex = new RegExp(regexStr, 'g')
      const regexResult = regex.exec(resource.type)
      if (!regexResult) return null
      return {
        coinType: regexResult[1],
        poolInfo: resource.data,
      }
    }).filter(notEmpty)
    return filteredResource
  }

  /**
   * Get MasterChefData resource.
   * @returns MasterChefData
   */
  async getMasterChefData(): Promise<MasterChefData> {
    const { modules } = this.sdk.networkOptions
    const dataType = composeMasterChefData(modules.MasterChefScripts)
    const resource = await this.sdk.resources.fetchAccountResource<MasterChefData>(
      modules.MasterChefResourceAccountAddress,
      dataType,
    )
    if (!resource) {
      throw new Error(`resource (${dataType}) not found`)
    }
    return resource.data
  }

  /**
   * Return the staking coin info for a given address
   * @param userAddress address
   * @param coinType coinType, including `ANI` or `LPCoin<X, Y>`
   * @returns UserInfoReturn, {stakingAmount, pendingANI}
   */
  async getUserInfoByCoinType(userAddress: AptosResourceType, coinType: AptosResourceType): Promise<UserInfoReturn> {
    const { modules } = this.sdk.networkOptions
    const userInfoType = composeMasterChefUserInfo(modules.MasterChefScripts, coinType)
    const task1 = this.sdk.resources.fetchAccountResource<MasterChefUserInfo>(
      userAddress,
      userInfoType,
    )

    const task2 = this.getPoolInfoByCoinType(coinType)
    const task3 = this.getMasterChefData()

    const [resource, poolInfo, mcData] = await Promise.all([task1, task2, task3])
    if (!resource) {
      throw new Error(`resource (${userInfoType}) not found`)
    }

    const userInfo = resource.data

    return meta2UserInfoReturn(poolInfo, userInfo, mcData)
  }

  /**
   * Return all the staking coin infos for a given address
   * @param userAddress address
   * @returns a map, contains: LPCoin -> {stakingAmount, pendingANI}
   */
  async getUserInfoAll(userAddress: AptosResourceType): Promise<Map<string, UserInfoReturn>> {
    const { modules } = this.sdk.networkOptions
    // UserInfo
    const userInfoTypePrefix = composeMasterChefUserInfoPrefix(modules.MasterChefScripts)
    const task1 = this.sdk.resources.fetchAccountResources<MasterChefUserInfo>(
      userAddress,
    )
    // PoolInfo
    const lpCoinTypePrefix = composeMasterChefPoolInfoPrefix(modules.MasterChefScripts)
    const task2 = this.sdk.resources.fetchAccountResources<MasterChefPoolInfo>(
      modules.MasterChefResourceAccountAddress,
    )
    // MasterChefData
    const task3 = this.getMasterChefData()
    // await all
    const [userInfos, poolInfos, mcData] = await Promise.all([task1, task2, task3])
    if (!userInfos || !poolInfos) {
      throw new Error('resources not found')
    }
    // coinType2poolInfo
    const coinType2poolInfo: Map<string, MasterChefPoolInfo> = new Map()
    {
      poolInfos.map(resource => {
        if (!resource.type.includes(lpCoinTypePrefix)) return
        const tmp = resource.type.substring(lpCoinTypePrefix.length)
        const type = tmp.substring(1, tmp.length - 1)
        coinType2poolInfo.set(type, resource.data)
      })
    }
    // coinType2userInfo
    const coinType2userInfo: Map<string, UserInfoReturn> = new Map()
    {
      userInfos.map(resource => {
        if (!resource.type.includes(userInfoTypePrefix)) return
        const tmp = resource.type.substring(userInfoTypePrefix.length)
        const coinType = tmp.substring(1, tmp.length - 1)
        const userInfo = resource.data
        const poolInfo = coinType2poolInfo.get(coinType)
        if (!poolInfo) {
          throw new Error('resources not found')
        }
        const userInfoReturn = meta2UserInfoReturn(poolInfo, userInfo, mcData)
        coinType2userInfo.set(coinType, userInfoReturn)
      })
    }
    return coinType2userInfo
  }

  /**
   * Adhoc method
   * Return StakedLPInfo of `ANI` and `LPCoin<APT, ANI>`
   * @returns 
   */
  async getFirstTwoPairStakedLPInfo() : Promise<[StakedLPInfo, StakedLPInfo]> {
    const { modules } = this.sdk.networkOptions
    const mcData = await this.getMasterChefData()
    const ani = modules.AniAddress
    const pair: CoinPair = {
      coinX: this.sdk.networkOptions.nativeCoin,
      coinY: modules.AniAddress,
    }
    const lpCoin = composeLPCoin(modules.ResourceAccountAddress, pair.coinX, pair.coinY)
    const coinInfoTask = this.sdk.resources.fetchAccountResource<AptosCoinInfoResource>(
      modules.ResourceAccountAddress,
      composeType(modules.CoinInfo, [lpCoin])
    )
    const swapPoolTask = this.sdk.resources.fetchAccountResource<SwapPoolResource>(
      modules.ResourceAccountAddress,
      composeLP(modules.Scripts, pair.coinX, pair.coinY),
    )
    const aniPoolInfoTask = this.getPoolInfoByCoinType(ani)
    const lpCoinPoolInfoTask = this.getPoolInfoByCoinType(lpCoin)

    const [coinInfoResponse, swapPoolResponse, aniPoolInfoResponse, lpCoinPoolInfoResponse] =
      await Promise.all([coinInfoTask, swapPoolTask, aniPoolInfoTask, lpCoinPoolInfoTask])

    if (!coinInfoResponse || !swapPoolResponse || !aniPoolInfoResponse || !lpCoinPoolInfoResponse) {
      throw new Error('resource not found')
    }
    
    const lpSupply = coinInfoResponse.data.supply.vec[0].integer.vec[0].value // lp total supply
    const stakedLPCoin = lpCoinPoolInfoResponse.coin_reserve.value  // staked LP Coin amount
    const stakedANI = aniPoolInfoResponse.coin_reserve.value  // staked ANI amount
    // staked lpCoin value equals to ANI amount value
    const lpCoinValue2ANI = d(stakedLPCoin).div(d(lpSupply)).mul(d(swapPoolResponse.data.coin_y_reserve.value)).mul(2)

    const interestANI1 = d(mcData.per_second_ANI).mul(d(aniPoolInfoResponse.alloc_point)).div(d(mcData.total_alloc_point)).mul(d(100).sub(mcData.dao_percent)).div(d(100)).mul(YEAR_S)
    const aprANI = interestANI1.div(stakedANI)

    const interestANI2 = d(mcData.per_second_ANI).mul(d(lpCoinPoolInfoResponse.alloc_point)).div(d(mcData.total_alloc_point)).mul(d(100).sub(mcData.dao_percent)).div(d(100)).mul(YEAR_S)
    const aprLPCoin = interestANI2.div(lpCoinValue2ANI)

    const stakedAniReturn: StakedLPInfo = {
      apr: aprANI,
      lpAmount: d(stakedANI),
      lp2AniAmount: d(stakedANI),
    }

    const stakedLPCoinReturn: StakedLPInfo = {
      apr: aprLPCoin,
      lpAmount: d(stakedLPCoin),
      lp2AniAmount: d(lpCoinValue2ANI),
      coinX: d(stakedLPCoin).div(d(lpSupply)).mul(d(swapPoolResponse.data.coin_x_reserve.value)),
      coinY: d(stakedLPCoin).div(d(lpSupply)).mul(d(swapPoolResponse.data.coin_y_reserve.value)),
    }

    return [stakedAniReturn, stakedLPCoinReturn]
  }

  /**
   * Check if the given address is registered ANI
   * @param address address to check
   * @returns bool
   */
  async checkRegisteredANI(address: AptosResourceType): Promise<boolean> {
    const { modules } = this.sdk.networkOptions
    const coinStoreLP = composeCoinStore(modules.CoinStore, modules.AniAddress)
    try {
      const lpCoinStore = await this.sdk.resources.fetchAccountResource<AptosCoinStoreResource>(address, coinStoreLP)
      if (!lpCoinStore) return false
      return true
    } catch (e) {
      return false
    }
  }

  // Register ANI payload
  registerANIPayload(): Payload {
    const functionName = composeANIRegister(this.sdk.networkOptions.modules.AniAddress)

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: [],
    }
  }

  /**
   * Deposit/withdraw LPCoin payload
   * @param param0 
   * @returns 
   */
  stakeLPCoinPayload({
    amount,
    coinType,
    method,
  }: StakeLPCoinPayload): Payload {
    const { modules } = this.sdk.networkOptions
    const functionName = composeType(modules.MasterChefScripts, method)
    const typeArguments = [
      coinType,
    ]
    const args = [amount.toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: typeArguments,
      arguments: args,
    }
  }

  /**
   * Enter_staking/leave_staking ANI payload
   * Equal to Deposit/withdraw method with type args `ANI`
   * @param param0 
   * @returns 
   */
  stakeANIPayload({
    amount,
    method,
  }: StakeANIPayload): Payload {
    const { modules } = this.sdk.networkOptions
    const functionName = composeType(modules.MasterChefScripts, method)
    const args = [amount.toString()]

    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: args,
    }
  }
}

function aptosTypeInfo2AptosResourceType(params: AptosTypeInfo): AptosResourceType {
  return `${params.account_address}::${hexToString(params.module_name)}::${hexToString(params.struct_name)}`
}

function meta2UserInfoReturn(poolInfo: MasterChefPoolInfo, userInfo: MasterChefUserInfo, mcData: MasterChefData): UserInfoReturn {
  const stakedTotal = poolInfo.coin_reserve.value
  // calculate pending ANI
  const currentTimestamp = Math.floor(Date.now() / 1000)
  // let multipler = get_multiplier(pool.last_reward_timestamp, get_current_timestamp());
  const multipler = d(currentTimestamp).sub(d(poolInfo.last_reward_timestamp))
  // let reward_ANI = multipler * mc_data.per_second_ANI * (pool.alloc_point as u128) / (mc_data.total_alloc_point as u128) * ((100 - mc_data.dao_percent) as u128) / 100u128;
  const rewardAni = multipler.mul(mcData.per_second_ANI).mul(d(poolInfo.alloc_point)).div(d(mcData.total_alloc_point)).mul(d(100).sub(mcData.dao_percent)).div(d(100))
  // pool.acc_ANI_per_share = pool.acc_ANI_per_share + reward_ANI * ACC_ANI_PRECISION / (staked_total as u128);
  const accAniPerShare = d(poolInfo.acc_ANI_per_share).add(rewardAni.mul(d(ACC_ANI_PRECISION)).div(d(stakedTotal)))
  // let pending = (user_info.amount as u128) * pool.acc_ANI_per_share / ACC_ANI_PRECISION - user_info.reward_debt;
  const pendingAni = d(userInfo.amount).mul(accAniPerShare).div(d(ACC_ANI_PRECISION)).sub(d(userInfo.reward_debt))

  return {
    amount: d(userInfo.amount),
    pendingAni,
  }
}
