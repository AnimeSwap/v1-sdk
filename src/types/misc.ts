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
