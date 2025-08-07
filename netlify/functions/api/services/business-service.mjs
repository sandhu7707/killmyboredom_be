import { INCORRECT_REQUEST_PARAMS, UNAUTHORISED } from "../errors/error-types.mjs"
import { ObjectId, UUID } from "mongodb"
import jwt from 'jsonwebtoken'
import { MESSAGE_INCORRECT_REQUEST_PARAMS_MAPPING, UNAUTHORIZED_ACTION } from "../errors/error-messages.mjs"

async function saveBusinessData(businessData, db){
    
    let businessDataCollection = db.collection('businessData')

    let userBusinessRelationsCollection = db.collection('user-businessData')
    let jwtPayload = jwt.verify(businessData.token, process.env.JWT_SECRET)

    let result = await businessDataCollection.insertOne({...businessData.businessData, admin_user_id: jwtPayload.user_id})
    await userBusinessRelationsCollection.insertOne({user_id: jwtPayload.user_id, business_id: result.insertedId})
    return 
}

async function updateBusinessData(businessData, db){

    let businessDataCollection = db.collection('businessData')
    let jwtPayload = jwt.verify(businessData.token, process.env.JWT_SECRET)
    let businessId = businessData._id
    delete businessData._id
    let data = await businessDataCollection.findOne({_id: ObjectId.createFromHexString(businessId)})
    let admin_user_id = data.admin_user_id
    
    if(jwtPayload.user_id === admin_user_id){
        await businessDataCollection.updateOne({_id: ObjectId.createFromHexString(businessId)}, {$set: businessData})
        return 
    }
    else{
        throw({type: UNAUTHORISED, message: UNAUTHORIZED_ACTION})
    }
}

async function fetchAllBusinessCoords(db){
    let businessDataCollection = db.collection('businessData')

    let results = await businessDataCollection
    .find({})
    .project({
        'location': 1,
        'businessName': 1,
        'address': 1,
        'businessType': 1
    })
    .toArray()
    .then(result => result.map(it => {
        return {
            ...it,
            id: it._id
        }
    }))

    return results
}

async function fetchBusinessDataById(businessId, db){
    let businessDataCollection = db.collection('businessData')
    if(!businessId){
        throw({type: INCORRECT_REQUEST_PARAMS, message: INCORRECT_REQUEST_PARAMS})
    }
    return businessDataCollection.findOne({_id: ObjectId.createFromHexString(businessId)})
}

async function fetchRegisteredBusinesses(token, db){
    let user_id = jwt.verify(token, process.env.JWT_SECRET).user_id
    let userBusinessRelationsCollection = db.collection('user-businessData')
    let businessDataCollection = db.collection('businessData')

    let businessIds = await userBusinessRelationsCollection.find({user_id: user_id}).toArray()
    let businesses = null
    for(let it of businessIds){
        let businessData = await businessDataCollection.findOne({_id: it.business_id})
        if(!businesses){
            businesses = []
        }
        businesses.push(businessData)
    }

    return businesses
}

async function fetchFavoriteBusinesses(token, db){
    let userId = jwt.verify(token, process.env.JWT_SECRET).user_id
    let usersCollection = db.collection('users');
    let businessDataCollection = db.collection('businessData')

    let user = await usersCollection.findOne({_id: userId})
    if(!user){
        throw({type: INCORRECT_REQUEST_PARAMS, message: MESSAGE_INCORRECT_REQUEST_PARAMS_MAPPING})
    }
    if(!user.favorites){
        return []
    }

    let businessIds = user.favorites.map(it => ObjectId.createFromHexString(it))
    return businessDataCollection.find({_id: {$in: businessIds}}).toArray()
}

export default { fetchFavoriteBusinesses, saveBusinessData, fetchAllBusinessCoords, fetchBusinessDataById, fetchRegisteredBusinesses, updateBusinessData }