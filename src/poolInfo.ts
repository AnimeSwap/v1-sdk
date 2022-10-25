import Decimal from 'decimal.js'
import { CoinPair, SwapEventParams } from './modules/SwapModule'
import { NetworkType, SDK } from './sdk'
import { AptosEvent } from './types/aptos'
import { d, notEmpty } from './utils'

const sdk = new SDK('https://fullnode.mainnet.aptoslabs.com', NetworkType.Mainnet)
// const sdk = new SDK('https://fullnode.testnet.aptoslabs.com', NetworkType.Testnet)

const coin2Reserve: { [key: string]: Decimal } = {}
type SwapEventsGroup = {
    coinXIn: Decimal
    coinXOut: Decimal
    coinYIn: Decimal
    coinYOut: Decimal
    number: number
}

export async function parseAllLPCoins() {
    // lpCoin apr, maybe NaN if pair not exist at the given ledger version
    // LPCoinsAPR: { [key: string]: { [key: string]: Decimal } }
    const LPCoinsAPRTask = sdk.swap.getLPCoinAPYBatch(d(2e6))
    // get all lp coins
    const allLPTask = sdk.swap.getAllLPCoinResourcesWithAdmin()
    const [LPCoinsAPR, allLP] = await Promise.all([LPCoinsAPRTask, allLPTask])
    console.log(`APR window second: ${LPCoinsAPR.windowSeconds}`)
    const allLPCoins = allLP.filter(notEmpty).map(element => {
        const apr = LPCoinsAPR.apys[`${element.coinX}, ${element.coinY}`]
        const ret = {
            coinX: element.coinX,
            coinY: element.coinY,
            coinXReserve: element.coinXReserve,
            coinYReserve: element.coinYReserve,
            apr,
        }
        return ret
    })
    console.log('All LPCoins:')
    console.log(allLPCoins)
    // get all coin reserves
    allLPCoins.forEach(element => {
        if (coin2Reserve[element.coinX]) {
            coin2Reserve[element.coinX] = coin2Reserve[element.coinX].add(d(element.coinXReserve))
        } else {
            coin2Reserve[element.coinX] = d(element.coinXReserve)
        }
        if (coin2Reserve[element.coinY]) {
            coin2Reserve[element.coinY] = coin2Reserve[element.coinY].add(d(element.coinYReserve))
        } else {
            coin2Reserve[element.coinY] = d(element.coinYReserve)
        }
    })
    console.log('LPCoin reserves:')
    console.log(coin2Reserve)
}

export async function getCoinPairSwapEvents(coinPair: CoinPair, startVersion: string): Promise<SwapEventsGroup> {
    const batchSize = 100   // for rpc api, Max batch size is 100. More than 100 will take bug
    const allEvents: AptosEvent[] = []
    let eventParams: SwapEventParams = {
        coinPair: coinPair,
        fieldName: 'swap_event',
        query: {
            limit: batchSize,
        },
    }
    let events = await sdk.swap.getEvents(eventParams)
    allEvents.push(...events.filter(v => d(v.version).gt(d(startVersion)))) 
    console.log(allEvents.length)
    while (d(events[0].sequence_number).gt(0) 
        && d(events[0].version).gt(d(startVersion))) {
        // the api is strange, cannot use reverse start, so we do it like this
        // you can only give the start sequence_number, so the next batch start should be `Max(events[0].sequence_number - batchSize, 0)`
        let start = BigInt(events[0].sequence_number) - BigInt(batchSize)
        const limit = start > BigInt(0) ? batchSize : batchSize + Number((start - BigInt(0)))
        start = start > BigInt(0) ? start : BigInt(0)
        eventParams = {
            coinPair: coinPair,
            fieldName: 'swap_event',
            query: {
                start: start,
                limit: limit,
            },
        }
        events = await sdk.swap.getEvents(eventParams)
        allEvents.push(...events.filter(v => d(v.version).gt(d(startVersion))))
    }
    const swapEventsGroup: SwapEventsGroup = {
        coinXIn: d(0),
        coinXOut: d(0),
        coinYIn: d(0),
        coinYOut: d(0),
        number: 0,
    }
    allEvents.forEach( v => {
        swapEventsGroup.coinXIn = swapEventsGroup.coinXIn.add(v.data.amount_x_in)
        swapEventsGroup.coinXOut = swapEventsGroup.coinXOut.add(v.data.amount_x_out)
        swapEventsGroup.coinYIn = swapEventsGroup.coinYIn.add(v.data.amount_y_in)
        swapEventsGroup.coinYOut = swapEventsGroup.coinYOut.add(v.data.amount_y_out)
        swapEventsGroup.number++
    })
    console.log(swapEventsGroup)
    return swapEventsGroup
}

parseAllLPCoins()
