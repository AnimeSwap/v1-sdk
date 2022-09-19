import SDK from '../main'

// const CoinsMapping: { [key: string]: string } = {
//   APTOS: '0x1::aptos_coin::AptosCoin',
//   BTC: '0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::DemoTestCoinsV1::BTC',
//   OTHER: '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::BTC',
// }

describe('Swap Module', () => {
  const sdk = new SDK({
    nodeUrl: 'https://fullnode.devnet.aptoslabs.com',
    networkOptions: {
      nativeCoin: '0x1::aptos_coin::AptosCoin',
      modules: {
        Scripts: '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2::AnimeSwapPoolV1',
        CoinInfo: '0x1::coin::CoinInfo',
        CoinStore: '0x1::coin::CoinStore',
        DeployerAddress: '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2',
        ResourceAccountAddress: '0xe73ee18380b91e37906a728540d2c8ac7848231a26b99ee5631351b3543d7cf2',
        AniAddress: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78::AnimeMasterChefV1::ANI',
        MasterChefScripts: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78::AnimeMasterChefV1',
        MasterChefDeployerAddress: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78',
        MasterChefResourceAccountAddress: '0x3e8c3184eef4aba3a91e2d99a08c47354320bc0b4d3ce7d5216d58ecacc0ef78',
      },
    },
  })

  test('getLpInfoResources', async () => {
    const output = await sdk.MasterChef.getLpInfoResources()
    expect(output.lp_list.length).toBeGreaterThan(0)
  })
})
