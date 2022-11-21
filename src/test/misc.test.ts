import SDK, { NetworkType } from '../main'

const address = '0x8aacfa7a452ddea2c1953e59e52be5c7171f7281ba60ea52c3d5e5950000'

describe('Misc Module', () => {
  const sdk = new SDK('https://fullnode.mainnet.aptoslabs.com', NetworkType.Mainnet)

  // ---------- Airdrop ----------

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

  // ---------- AutoANI ----------

  // test('calculateAutoAniStakedAmount', async () => {
  //   const address2 = '0xf920ce46ae9befa1639ef751053ce5f3de5e526df6d598ef384880faaf6eac27'
  //   const output = await sdk.Misc.calculateAutoAniStakedAmount(address2)
  //   console.log(output)
  //   expect(1).toBe(1)
  // })

  // test('calculateAutoAniHarvestCallFee', async () => {
  //   const output = await sdk.Misc.calculateAutoAniHarvestCallFee()
  //   console.log(output)
  //   expect(1).toBe(1)
  // })

  // test('autoAniDepositPayload', async () => {
  //   const payload = sdk.Misc.autoAniDepositPayload(1e8.toString())
  //   console.log(payload)
  //   expect(1).toBe(1)
  // })

  // test('autoAniWithdrawAllPayload', async () => {
  //   const payload = sdk.Misc.autoAniWithdrawAllPayload()
  //   console.log(payload)
  //   expect(1).toBe(1)
  // })

  // test('autoAniWithdrawPayload', async () => {
  //   const address2 = '0xf920ce46ae9befa1639ef751053ce5f3de5e526df6d598ef384880faaf6eac27'
  //   const output = await sdk.Misc.calculateAutoAniStakedAmount(address2)
  //   const withdrawAmount = 123e8  // assume user want to withdraw 123 ANI, assert 0 < withdrawAmount < output.amount
  //   const shares = d(withdrawAmount).mul(output.shares).div(output.amount).ceil()
  //   const payload = sdk.Misc.autoAniWithdrawPayload(shares)
  //   console.log(payload)
  //   expect(1).toBe(1)
  // })

  // test('autoAniHarvestPayload', async () => {
  //   const payload = sdk.Misc.autoAniHarvestPayload()
  //   console.log(payload)
  //   expect(1).toBe(1)
  // })
})
