import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { AptosResource, AptosResourceType } from '../types/aptos'
import { isAxiosError } from '../utils/is'

export class ResourcesModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  async fetchAccountResource<T = unknown>(accountAddress: string, resourceType: AptosResourceType, ledgerVersion?: BigInt | number): Promise<AptosResource<T> | undefined> {
    try {
      const response = await this._sdk.client.getAccountResource(accountAddress, resourceType, {ledgerVersion: ledgerVersion})
      return response as unknown as AptosResource<T>
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        if (e.response?.status === 404) {
          return undefined
        }
      }
      console.log(e)
      throw e
    }
  }

  async fetchAccountResources<T = unknown>(accountAddress: string, ledgerVersion?: BigInt | number): Promise<AptosResource<T>[] | undefined> {
    try {
      const response = await this._sdk.client.getAccountResources(accountAddress, {ledgerVersion: ledgerVersion})
      return response as unknown as AptosResource<T>[]
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        if (e.response?.status === 404) {
          return undefined
        }
      }
      throw e
    }
  }
}
