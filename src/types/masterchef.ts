import { AptosTypeInfo } from './aptos'

export type MasterChefLPInfo = {
  lp_list: AptosTypeInfo[]
}

export type MasterChefPoolInfo = {
  acc_ANI_per_share: string
  alloc_point: string
  last_reward_timestamp: string
}

export type MasterChefData = {
  bonus_multiplier: string
  dev_percent: string
  dao_percent: string
  per_second_ANI: string
  start_timestamp: string
  total_alloc_point: string
}

export type MasterChefUserInfo = {
  amount: string
  reward_debt: string
}
