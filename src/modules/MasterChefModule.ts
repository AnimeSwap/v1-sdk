import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { composeMasterChefPoolInfo, composeMasterChefLpList, composeMasterChefPoolInfoPrefix } from '../utils/contractComposeType'
import { AptosResourceType, AptosTypeInfo } from '../types/aptos'
import { hexToString } from '../utils/hex'
import { MasterChefLPInfo, MasterChefPoolInfo } from '../types/masterchef'
import { notEmpty } from '../utils/is'

export type allPoolInfoList = {
  coinType: AptosResourceType
  poolInfo: MasterChefPoolInfo
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
}

function aptosTypeInfo2AptosResourceType(params: AptosTypeInfo): AptosResourceType {
  return `${params.account_address}::${hexToString(params.module_name)}::${hexToString(params.struct_name)}`
}
