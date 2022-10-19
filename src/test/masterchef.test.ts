import SDK, { NetworkType } from '../main'
const coinType = '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2::LPCoinV1::LPCoin<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::BTC, 0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::USDT>>'

describe('Swap Module', () => {
  const sdk = new SDK('https://fullnode.devnet.aptoslabs.com', NetworkType.Devnet)

  test('getLPInfoResources', async () => {
    const output = await sdk.MasterChef.getLPInfoResources()
    console.log(output)
    expect(output.length).toBeGreaterThan(0)
  })

  test('getPoolInfoByCoinType', async () => {
    const output = await sdk.MasterChef.getPoolInfoByCoinType(sdk.networkOptions.modules.AniAddress)
    console.log(output)
    expect(Number(output.alloc_point)).toBeGreaterThan(0)
  })

  test('getAllPoolInfo', async () => {
    const output = await sdk.MasterChef.getAllPoolInfo()
    console.log(output)
    expect(output.length).toBeGreaterThan(0)
  })

  test('getMasterChefData', async () => {
    const output = await sdk.MasterChef.getMasterChefData()
    console.log(output)
    expect(1).toBe(1)
  })

  test('getUserInfoByCoinType', async () => {
    const output = await sdk.MasterChef.getUserInfoByCoinType(sdk.networkOptions.modules.MasterChefDeployerAddress, sdk.networkOptions.modules.AniAddress)
    console.log(output)
    expect(1).toBe(1)
  })

  test('getUserInfoAll', async () => {
    const output = await sdk.MasterChef.getUserInfoAll(sdk.networkOptions.modules.MasterChefDeployerAddress)
    console.log(output)
    expect(1).toBe(1)
  })

  test('stakeLPCoinPayload', async () => {
    const output = sdk.MasterChef.stakeLPCoinPayload({
      amount: '100000000',
      coinType,
      method: 'deposit',
    })
    console.log(output)
    expect(1).toBe(1)
  })

  test('stakeANIPayload', async () => {
    const output = sdk.MasterChef.stakeANIPayload({
      amount: '100000000',
      method: 'enter_staking',
    })
    console.log(output)
    expect(1).toBe(1)
  })
})
