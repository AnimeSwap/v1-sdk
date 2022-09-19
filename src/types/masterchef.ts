import { AptosTypeInfo } from './aptos'

export type MasterChefLPInfo = {
  lp_list: AptosTypeInfo[]
}

export type MasterChefPoolInfo = {
  acc_ANI_per_share: string
  alloc_point: string
  last_reward_timestamp: string
}
