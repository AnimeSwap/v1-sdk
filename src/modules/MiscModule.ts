import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  AptosCoinStoreResource,
  AptosResourceType,
  Payload,
} from '../types/aptos'
import { d } from '../utils/number'
import Decimal from 'decimal.js'
import {
  AirdropResource,
  AutoAniData,
  AutoAniUserInfo,
} from '../types/misc'
import {
  composeAutoAniData,
  composeAutoAniUserInfo,
  composeCoinStore,
  composeType,
} from '../utils'

export type AutoAniStakedReturn = {
  lastUserActionAni: Decimal  // last user action ANI. Deposit value.
  amount: Decimal // current amount. Deposit value + interest
  afterPenaltyAmount: Decimal // after penalty amount. equalt to `amount * (1 - penalty)`
  withdrawFeeFreeTimestamp: Decimal  // after this timestamp, no withdraw_fee penalty
  shares: Decimal // for withdraw part. amount = k * shares
  // lastUserActionAni is an approximation, do not show it
  // interest = amount - lastUserActionAni, show this value
}

export type StakedAutoAniInfo = {
  amount: Decimal // total staked amount
}

export class MiscModule implements IModule {
  protected _sdk: SDK

  get sdk() {
    return this._sdk
  }

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  // ---------- Airdrop ----------

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

  // ---------- AutoANI ----------

  /**
   * calculate AutoAni account amount, including interest
   * @param address user address
   * @returns AutoAniStakedReturn
   */
  async calculateAutoAniStakedAmount(address: AptosResourceType): Promise<AutoAniStakedReturn> {
    const autoAniUserInfo = await this._getAutoANIUserInfo(address)
    const autoAniData = await this._getAutoANIData()
    const balanceOf = await this._autoAniBalanceOf()
    const amount = d(autoAniUserInfo.shares).mul(balanceOf).div(autoAniData.total_shares).floor()
    const afterPenaltyAmount = amount.mul(d(10000).sub(autoAniData.withdraw_fee)).div(10000).ceil() // this method use ceil()
    const withdrawFeeFreeTimestamp = d(autoAniUserInfo.last_deposited_time).add(d(autoAniData.withdraw_fee_period))
    return {
      lastUserActionAni: d(autoAniUserInfo.last_user_action_ANI),
      amount,
      afterPenaltyAmount,
      withdrawFeeFreeTimestamp,
      shares: d(autoAniUserInfo.shares),
    }
  }

  /**
   * calculate staked auto ANI info
   * @returns StakedAutoAniInfo
   */
  async calculateAutoAniInfo(): Promise<StakedAutoAniInfo> {
    const balanceOf = await this._autoAniBalanceOf()
    return {
      amount: balanceOf,
    }
  }

  /**
   * calculate harvest call_fee reward
   */
  async calculateAutoAniHarvestCallFee(): Promise<Decimal> {
    const autoAniData = await this._getAutoANIData()
    const available = await this._autoAniAvalableAfterLeaveStaking()
    const callFee = available.mul(autoAniData.call_fee).div(10000).floor()
    return callFee
  }

  async _getAutoANIUserInfo(address: AptosResourceType): Promise<AutoAniUserInfo> {
    const { misc } = this.sdk.networkOptions
    const userInfo = await this.sdk.resources.fetchAccountResource<AutoAniUserInfo>(
      address,
      composeAutoAniUserInfo(misc.AutoAniScripts),
    )
    if (!userInfo) throw new Error('AutoAni user info resource not found')
    return userInfo.data
  }

  async _getAutoANIData(): Promise<AutoAniData> {
    const { misc } = this.sdk.networkOptions
    const data = await this.sdk.resources.fetchAccountResource<AutoAniData>(
      misc.AutoAniResourceAccountAddress,
      composeAutoAniData(misc.AutoAniScripts),
    )
    if (!data) throw new Error('AutoAni data resource not found')
    return data.data
  }

  // equal to contract `balance_of()`
  async _autoAniBalanceOf() {
    const { modules, misc } = this.sdk.networkOptions
    const userInfoReturn = await this.sdk.MasterChef.getUserInfoByCoinType(misc.AutoAniResourceAccountAddress, modules.AniAddress)
    const raBalance = await this.getBalance(misc.AutoAniResourceAccountAddress, modules.AniAddress)
    return raBalance.add(userInfoReturn.amount)
  }

  // equal to contract `leave_staking()` then `available()`
  async _autoAniAvalableAfterLeaveStaking() {
    const { modules, misc } = this.sdk.networkOptions
    const userInfoReturn = await this.sdk.MasterChef.getUserInfoByCoinType(misc.AutoAniResourceAccountAddress, modules.AniAddress)
    const raBalance = await this.getBalance(misc.AutoAniResourceAccountAddress, modules.AniAddress)
    return raBalance.add(userInfoReturn.pendingAni)
  }

  autoAniDepositPayload(amount: Decimal | string): Payload {
    const { misc } = this.sdk.networkOptions
    const functionName = composeType(misc.AutoAniScripts, 'deposit')
    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: [amount.toString()],
    }
  }

  autoAniWithdrawAllPayload(): Payload {
    const { misc } = this.sdk.networkOptions
    const functionName = composeType(misc.AutoAniScripts, 'withdraw_all')
    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: [],
    }
  }

  autoAniWithdrawPayload(shares: Decimal | string): Payload {
    const { misc } = this.sdk.networkOptions
    const functionName = composeType(misc.AutoAniScripts, 'withdraw')
    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: [shares.toString()],
    }
  }

  autoAniHarvestPayload(): Payload {
    const { misc } = this.sdk.networkOptions
    const functionName = composeType(misc.AutoAniScripts, 'harvest')
    return {
      type: 'entry_function_payload',
      function: functionName,
      type_arguments: [],
      arguments: [],
    }
  }

  // ---------- common ----------

  // get `address` `coinType` balance
  async getBalance(address: AptosResourceType, coinType: AptosResourceType): Promise<Decimal> {
    const { modules } = this.sdk.networkOptions
    const coinStore = await this.sdk.resources.fetchAccountResource<AptosCoinStoreResource>(
      address,
      composeCoinStore(modules.CoinStore, coinType),
    )
    if (!coinStore) throw new Error('CoinType balance resource not found')
    return d(coinStore.data.coin.value)
  }
}
