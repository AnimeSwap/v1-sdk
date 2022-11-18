import { AptosResourceType } from './aptos'

export type AirdropResource = {
  map: {
    data: [{
      key: AptosResourceType
      value: AptosResourceType
    }]
  }
  treasury: {
    value: AptosResourceType
  }
}

export type AutoAniUserInfo = {
  shares: AptosResourceType
  last_deposited_time: AptosResourceType
  last_user_action_ANI: AptosResourceType
  last_user_action_time: AptosResourceType
}

export type AutoAniData = {
  total_shares: AptosResourceType
  performance_fee: AptosResourceType
  call_fee: AptosResourceType
  withdraw_fee: AptosResourceType
  withdraw_fee_period: AptosResourceType
  last_harvested_time: AptosResourceType
}
