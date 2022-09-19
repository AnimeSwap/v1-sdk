import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  composeMasterChefPoolInfo,
  composeMasterChefLpList,
  composeMasterChefPoolInfoPrefix,
  composeMasterChefData,
  composeMasterChefUserInfo,
  composeCoinStore,
} from '../utils/contractComposeType'
import { AptosCoinStoreResource, AptosResourceType, AptosTypeInfo } from '../types/aptos'
import { hexToString } from '../utils/hex'
import {
  MasterChefData,
  MasterChefLPInfo,
  MasterChefPoolInfo,
  MasterChefUserInfo,
} from '../types/masterchef'
import { notEmpty } from '../utils/is'
import Decimal from 'decimal.js'
import { d } from '../utils/number'

export type allPoolInfoList = {
  coinType: AptosResourceType
  poolInfo: MasterChefPoolInfo
}

export type UserInfoReturn = {
  amount: Decimal
  pendingAni: Decimal
}

export class MasterChefModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  async getLpInfoResources(): Promise<AptosResourceType[]> {
    const { modules } = this.sdk.networkOptions
    const lpList = composeMasterChefLpList(modules.MasterChefDeployerAddress)
    const resource = await this.sdk.resources.fetchAccountResource<MasterChefLPInfo>(
      modules.MasterChefDeployerAddress,
      lpList,
    )
    if (!resource) {
      throw new Error(`resource (${lpList}) not found`)
    }
    const aptosTypeInfoList = resource.data.lp_list
    return aptosTypeInfoList.map(v=>{
      return aptosTypeInfo2AptosResourceType(v)
    })
  }

  async getPoolInfoByCoinType(coinType: AptosResourceType): Promise<MasterChefPoolInfo> {
    const { modules } = this.sdk.networkOptions
    const poolInfoType = composeMasterChefPoolInfo(modules.MasterChefDeployerAddress, coinType)
    const resource = await this.sdk.resources.fetchAccountResource<MasterChefPoolInfo>(
      modules.MasterChefResourceAccountAddress,
      poolInfoType,
    )
    if (!resource) {
      throw new Error(`resource (${poolInfoType}) not found`)
    }
    return resource.data
  }

  async getAllPoolInfo(): Promise<allPoolInfoList[]> {
    const { modules } = this.sdk.networkOptions
    const resources = await this.sdk.resources.fetchAccountResources<MasterChefPoolInfo>(
      modules.MasterChefResourceAccountAddress,
    )
    if (!resources) {
      throw new Error('resources not found')
    }
    const lpCoinTypePrefix = composeMasterChefPoolInfoPrefix(modules.MasterChefDeployerAddress)
    const regexStr = `^${lpCoinTypePrefix}<(.+)>$`
    const filteredResource = resources.map(resource => {
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

  async getMasterChefData(): Promise<MasterChefData> {
    const { modules } = this.sdk.networkOptions
    const dataType = composeMasterChefData(modules.MasterChefDeployerAddress)
    const resource = await this.sdk.resources.fetchAccountResource<MasterChefData>(
      modules.MasterChefDeployerAddress,
      dataType,
    )
    if (!resource) {
      throw new Error(`resource (${dataType}) not found`)
    }
    return resource.data
  }

  async getUserInfo(userAddress: AptosResourceType, coinType: AptosResourceType): Promise<UserInfoReturn> {
    const ACC_ANI_PRECISION = 1e12
    const { modules } = this.sdk.networkOptions
    const userInfoType = composeMasterChefUserInfo(modules.MasterChefDeployerAddress, coinType)
    const task1 = this.sdk.resources.fetchAccountResource<MasterChefUserInfo>(
      userAddress,
      userInfoType,
    )

    const task2 = this.getPoolInfoByCoinType(coinType)
    const task3 = this.getMasterChefData()

    const coinStoreType = composeCoinStore(modules.CoinStore, coinType)
    const task4 = this.sdk.resources.fetchAccountResource<AptosCoinStoreResource>(
      modules.MasterChefResourceAccountAddress,
      coinStoreType,
    )
    const [resource, poolInfo, mcData, lpCoinStore] = await Promise.all([task1, task2, task3, task4])
    if (!resource) {
      throw new Error(`resource (${userInfoType}) not found`)
    }

    if (!lpCoinStore) {
      throw new Error(`resource (${coinStoreType}) not found`)
    }
    const userInfo = resource.data
    const stakedTotal = lpCoinStore.data.coin.value

    // calculate pending ANI
    const currentTimestamp = Math.floor(Date.now()/1000)
    // let multipler = get_multiplier(pool.last_reward_timestamp, get_current_timestamp(), mc_data.bonus_multiplier);
    const multipler = d(mcData.bonus_multiplier).mul(d(currentTimestamp).sub(d(poolInfo.last_reward_timestamp)))
    // let reward_ANI = multipler * mc_data.per_second_ANI * (pool.alloc_point as u128) / (mc_data.total_alloc_point as u128) * ((100 - mc_data.dev_percent) as u128) / 100u128;
    const rewardAni = multipler.mul(mcData.per_second_ANI).mul(d(poolInfo.alloc_point)).div(d(mcData.total_alloc_point)).mul(d(100).sub(mcData.dev_percent)).div(d(100))
    // pool.acc_ANI_per_share = pool.acc_ANI_per_share + reward_ANI * ACC_ANI_PRECISION / (lp_supply as u128);
    const accAniPerShare = d(poolInfo.acc_ANI_per_share).add(rewardAni.mul(d(ACC_ANI_PRECISION)).div(stakedTotal))
    // let pending = (user_info.amount as u128) * pool.acc_ANI_per_share / ACC_ANI_PRECISION - user_info.reward_debt;
    const pendingAni = d(userInfo.amount).mul(accAniPerShare).div(d(ACC_ANI_PRECISION)).sub(d(userInfo.reward_debt))

    return {
      amount: d(userInfo.amount),
      pendingAni,
    }
  }
}

function aptosTypeInfo2AptosResourceType(params: AptosTypeInfo): AptosResourceType {
  return `${params.account_address}::${hexToString(params.module_name)}::${hexToString(params.struct_name)}`
}