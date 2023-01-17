import { Bytes } from '@graphprotocol/graph-ts'
import { Address } from '@graphprotocol/graph-ts'
import { 
    BigDecimal, 
    BigInt,
    ethereum,
} from '@graphprotocol/graph-ts'


import {
	
	transaction,
} from './generated/schema'


export namespace events {
	export function id(event: ethereum.Event): string {
		return event.block.number.toString().concat('-').concat(event.logIndex.toString())
	}
}


export namespace constants {
	export let   BIGINT_ZERO      = BigInt.fromI32(0)
	export let   BIGINT_ONE       = BigInt.fromI32(1)
	export let   BIGDECIMAL_ZERO  = new BigDecimal(constants.BIGINT_ZERO)
	export let   BIGDECIMAL_ONE   = new BigDecimal(constants.BIGINT_ONE)
	export const ADDRESS_ZERO     = '0x0000000000000000000000000000000000000000'
	export const BYTES32_ZERO     = '0x0000000000000000000000000000000000000000000000000000000000000000'
}

export namespace transactions {
	export function log(event: ethereum.Event): transaction {
		
		let tx = transaction.load(event.transaction.hash.toHexString())
		if (!tx) {
			
			tx = new transaction(event.transaction.hash.toHexString())
			tx.timestamp   = event.block.timestamp.toI32()
			tx.blockNumber = event.block.number.toI32()
        	tx.unmatchedTransferCount = 0
			tx.gasPrice = event.transaction.gasPrice
			tx.transactionFrom = event.transaction.from
			tx.transfers = new Array<string>()
			tx.save()
			}

		return tx as transaction
	}
	export type Tx = transaction
}


