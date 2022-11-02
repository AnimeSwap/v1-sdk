import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  AptosResourceType,
  Payload,
} from '../types/aptos'
import { d } from '../utils/number'
import Decimal from 'decimal.js'
import { AirdropResource } from '../types/misc'
import { composeType } from '../utils'

export class MiscModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  /**
   * Check user's airdrop balance
   * @param address user's address, will auto-remove prefix 0s
   * @returns airdrop balance. If no airdrop, return NaN. If already claimed, return 0.
   */
  async checkUserAirdropBalance(address: AptosResourceType): Promise<Decimal> {
    const { misc } = this.sdk.networkOptions
    // remove left 0
    address = address.replace(/^0x0+/, '0x')
    const airdrop = await this.sdk.resources.fetchAccountResource<AirdropResource>(
      misc.AirdropDeployer,
      composeType(misc.AirdropDeployer, 'Airdrop', 'Airdrop')
    )
    if (!airdrop) throw new Error('Airdrop resource not found')
    let result = d(NaN)
    // since the total length is lt 2k, no need for using binary search
    airdrop.data.map.data.forEach(element => {
      if (element.key == address) {
        result = d(element.value)
      }
    })

    return result
  }

  claimAirdropPayload(): Payload {
    const { misc } = this.sdk.networkOptions
    const functionName = composeType(misc.AirdropDeployer, 'Airdrop', 'claim_airdrop')
    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: [],
    }
  }
}
