import {
	Address,
    BigDecimal,
    BigInt,
} from '@graphprotocol/graph-ts'
import {
	ipfs,
	json,
	JSONValue,
	TypedMap,
	log
  } from "@graphprotocol/graph-ts";

import {
	IERC721Metadata, 
} from '../../generated/IERC721/IERC721Metadata'

import {
	Contract721
} from '../../generated/IERC721/Contract721'

import {
	account,
	collection,
    contract,
	token,
	Attribute
} from '../../generated/schema'

import {
	supportsInterface,
} from './erc165'

import {
	constants,
} from '../../graphprotocol-utils'

export function fetchRegistry(address: Address): collection {
	let erc721   		= IERC721Metadata.bind(address)
	let Collection 		= Contract721.bind(address)
	let contractEntity  = contract.load(address.toHexString())

	if (contractEntity == null) {
		contractEntity = new contract(address.toHexString())
		let introspection_01ffc9a7 = supportsInterface(erc721, '01ffc9a7') // ERC165
		let introspection_80ac58cd = supportsInterface(erc721, '80ac58cd') // ERC721
		let introspection_00000000 = supportsInterface(erc721, '00000000', false)
		let isERC721               = introspection_01ffc9a7 && introspection_80ac58cd && introspection_00000000
		contractEntity.asERC721          = isERC721 ? contractEntity.id : null
		contractEntity.save()
	}

	
	let collectionEntity = collection.load(contractEntity.id)
	if (collectionEntity == null) {
		collectionEntity = new collection(contractEntity.id)

		//contract calls
		let try_name              		  = erc721.try_name()
		let try_symbol            		  = erc721.try_symbol()
		let try_mintPrice				  = Collection.try_price()
		let mintPriceBigInt				  = try_mintPrice.reverted ? BigInt.fromI32(0)	: try_mintPrice.value 	
		let mintPrice 			  		  = mintPriceBigInt.divDecimal(BigDecimal.fromString('1000000000000000000'))
		
		collectionEntity.name             = try_name.reverted   ? '' : try_name.value
		collectionEntity.symbol           = try_symbol.reverted ? '' : try_symbol.value
		collectionEntity.mintPrice 		  = mintPrice
		collectionEntity.supportsMetadata = supportsInterface(erc721, '5b5e139f') // ERC721Metadata
		collectionEntity.totalSales 	  = 0
		collectionEntity.totalVolume 	  = constants.BIGDECIMAL_ZERO
		collectionEntity.topSale	 	  = constants.BIGDECIMAL_ZERO
	}
	return collectionEntity as collection
	

	//return null as collection
}

function getJSONFromIPFS(url: string): TypedMap<string, JSONValue> | null {
	let hash: string;
	if (url.startsWith("https://ipfs.io/ipfs/")) {
	  hash = url.replace("https://ipfs.io/ipfs/", "");
	} else if (url.startsWith("ipfs://")) {
	  hash = url.replace("ipfs://", "");
	} else {
	  return null;
	}
	const BytesData = ipfs.cat(hash);
	if (BytesData) {
	  return json.fromBytes(BytesData).toObject();
	}
	return null;
}


export function fetchToken(collection: collection, id: BigInt): token {
	let tokenid = collection.id.concat('_').concat(id.toString())
	let tokenEntity = token.load(tokenid)
	
	if (tokenEntity == null) {
		let account_zero = new account(constants.ADDRESS_ZERO)
		account_zero.save()

		tokenEntity            		= new token(tokenid)
		tokenEntity.collection 		= collection.id
		tokenEntity.identifier 		= id
		

		//update collection's total supply
		let Collection 				= Contract721.bind(Address.fromString(collection.id))
		let try_totalSupply			= Collection.try_totalSupply()
		let try_uri  				= Collection.try_tokenURI(id)
		tokenEntity.uri 			= try_uri.reverted ? ""  : try_uri.value
		

		collection.totalSupply	  	= try_totalSupply.reverted ? BigInt.fromI32(0)  : try_totalSupply.value
		const ipfs_data = getJSONFromIPFS(try_uri.reverted ? ""  : try_uri.value);
		if (ipfs_data) {
			let imageURL = ipfs_data.get("image");
			let name = ipfs_data.get("name")
			let description = ipfs_data.get("description")
			let creator = ipfs_data.get("creator")
			let attributes = ipfs_data.get("attributes")
			if (imageURL) {
				tokenEntity.image = imageURL.toString();
			}
			if (name) {
				tokenEntity.name = name.toString();
			}
			if (description) {
				tokenEntity.description = description.toString();
			}
			if (creator) {
				tokenEntity.creator = creator.toString();
			}

			const attribs = ipfs_data.get("attributes");

			if (attribs) {
				let newAttributes: Array<string> = []
				let attributesArray = attribs.toArray()
	
				let currentType: string
				let currentValue: string
	
				for (let i = 0; i < attributesArray.length; i++) {
					currentType = attributesArray[i]
						.toObject()
						.mustGet('trait_type')
						.toString()
					currentValue = attributesArray[i]
						.toObject()
						.mustGet('value')
						.toString()
	
					const newTypeString = currentType.replace(' ', '_')
					const newValueString = currentValue.replace(' ', '_')
					const attributeId = newTypeString + '-' + newValueString
	
					let existingAttribute = Attribute.load(attributeId)
					if (!existingAttribute) {
						let newAttribute = new Attribute(attributeId)
						newAttribute.trait_type = currentType
						newAttribute.value = currentValue
						newAttribute.save()
		
						newAttributes.push(newAttribute.id)
		
						tokenEntity.traits = newAttributes
					}
	
					log.debug(
						'newAttributes: {} | eventBadgeMetadata.attributes: {}',
						[
							newAttributes.toString(),
							tokenEntity.traits!.toString(),
						]
					)
				}
			}

				
				
			
		}			
	}
	return tokenEntity as token
}

