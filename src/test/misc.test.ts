import SDK, { NetworkType } from '../main'

const address = '0x8aacfa7a452ddea2c1953e59e52be5c7171f7281ba60ea52c3d5e5950000'

describe('Misc Module', () => {
  const sdk = new SDK('https://fullnode.mainnet.aptoslabs.com', NetworkType.Mainnet)

  test('checkUserAirdropBalance', async () => {
    const output = await sdk.Misc.checkUserAirdropBalance(address)
    console.log(output)
    expect(Number(output)).toBeGreaterThanOrEqual(0)
  })

  test('checkUserAirdropBalance none', async () => {
    const output = await sdk.Misc.checkUserAirdropBalance('0x12')
    expect(Number(output)).toBe(NaN)
  })

  test('claimAirdropPayload none', async () => {
    const output = sdk.Misc.claimAirdropPayload()
    console.log(output)
    expect(1).toBe(1)
  })

  // test('calculateAutoAniStakedAmount', async () => {
  //   const addressTmp = '0xf920ce46ae9befa1639ef751053ce5f3de5e526df6d598ef384880faaf6eac27'
  //   const output = sdk.Misc.calculateAutoAniStakedAmount(addressTmp)
  //   console.log(output)
  //   expect(1).toBe(1)
  // })

  // test('calculateAutoAniHarvestCallFee', async () => {
  //   const output = await sdk.Misc.calculateAutoAniHarvestCallFee()
  //   console.log(output)
  //   expect(1).toBe(1)
  // })
})
