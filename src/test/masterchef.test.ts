import SDK from '../main'

describe('Swap Module', () => {
  const sdk = new SDK('https://fullnode.devnet.aptoslabs.com')

  test('getLpInfoResources', async () => {
    const output = await sdk.MasterChef.getLpInfoResources()
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
})
