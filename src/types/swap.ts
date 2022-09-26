import { BigNumber } from './common'
import { AptosResourceType } from './aptos'

export type SwapPoolResource = {
  coin_x_reserve: {
    value: string
  }
  coin_y_reserve: {
    value: string
  }
  k_last: string
  last_block_timestamp: string
  last_price_x_cumulative: string
  last_price_y_cumulative: string
  lp_burn_cap: {
    dummy_field: boolean
  }
  lp_freeze_cap: {
    dummy_field: boolean
  }
  lp_mint_cap: {
    dummy_field: boolean
  }
}

export type SwapPoolData = {
  dev_fee: BigNumber
  dev_fee_on: boolean
  fee_to: AptosResourceType
  fee_to_setter: AptosResourceType
  swap_fee: string
}
