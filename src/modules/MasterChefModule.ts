import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { MasterCheflpInfo } from '../types/masterchef'
import { composeMasterChefLpList } from '../utils/contractComposeType'

export class MasterChefModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  async getLpInfoResources(): Promise<MasterCheflpInfo> {
    const { modules } = this.sdk.networkOptions
    const resource = await this.sdk.resources.fetchAccountResource<MasterCheflpInfo>(
      modules.MasterChefDeployerAddress,
      composeMasterChefLpList(modules.MasterChefDeployerAddress),
    )
    if (!resource) {
      throw new Error(`resource (${composeMasterChefLpList(modules.MasterChefDeployerAddress)}) not found`)
    }
    return resource.data
  }
}
