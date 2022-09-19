import { AptosClient } from 'aptos'
import { SwapModule } from './modules/SwapModule'
import { RouteModule } from './modules/RouteModule'
import { MasterChefModule } from './modules/MasterChefModule'
import { ResourcesModule } from './modules/ResourcesModule'
import { AptosResourceType } from './types/aptos'

export type SdkOptions = {
  nodeUrl: string
  networkOptions: {
    nativeCoin: AptosResourceType
    modules: {
      CoinInfo: AptosResourceType
      CoinStore: AptosResourceType
      Scripts: AptosResourceType
      ResourceAccountAddress: AptosResourceType
      DeployerAddress: AptosResourceType
      AniAddress: AptosResourceType
      MasterChefScripts: AptosResourceType
      MasterChefDeployerAddress: AptosResourceType
      MasterChefResourceAccountAddress: AptosResourceType
    } & Record<string, AptosResourceType>
  }
}

export class SDK {
  protected _client: AptosClient
  protected _swap: SwapModule
  protected _route: RouteModule
  protected _masterchef: MasterChefModule
  protected _resources: ResourcesModule
  protected _networkOptions: SdkOptions['networkOptions']

  get swap() {
    return this._swap
  }

  get route() {
    return this._route
  }

  get MasterChef() {
    return this._masterchef
  }


  get resources() {
    return this._resources
  }

  get client() {
    return this._client
  }

  get networkOptions() {
    return this._networkOptions
  }

  constructor(options: SdkOptions) {
    this._networkOptions = options.networkOptions
    this._client = new AptosClient(options.nodeUrl)
    this._swap = new SwapModule(this)
    this._route = new RouteModule(this)
    this._masterchef = new MasterChefModule(this)
    this._resources = new ResourcesModule(this)
  }
}
