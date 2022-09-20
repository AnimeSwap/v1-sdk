export type address = string
export type AptosResourceType = string

export type AptosResource<T = unknown> = {
  data: T
  type: string
}

export type AptosCoinInfoResource = {
  decimals: number
  name: string
  supply: {
    vec: [{
      aggregator: {
        vec: [{
          handle: address
          key: address
          limit: string
        }]
      }
      integer: {
        vec: [{
          limit: string
          value: string
        }]
      }
    }]
  }
  symbol: string
}

export type AptosCoinStoreResource = {
  coin: {
    value: string
  }
  deposit_events: {
    counter: string
    guid: {
      id: {
        addr: address
        creation_num: string
      }
    }
  }
  frozen: boolean
  withdraw_events: {
    counter: string
    guid: {
      id: {
        addr: address
        creation_num: string
      }
    }
  }
}

export type AptosTypeInfo = {
  account_address: AptosResourceType
  module_name: AptosResourceType
  struct_name: AptosResourceType
}

export type EntryFunctionPayload = {
  type: 'entry_function_payload'
  function: string
  typeArguments: string[]
  arguments: string[]
}

export type Payload = EntryFunctionPayload

export type AptosCreateTx = {
  sender: string
  maxGasAmount: string
  gasUnitPrice: string
  gasCurrencyCode: string
  expiration: string
  payload: Payload
}
