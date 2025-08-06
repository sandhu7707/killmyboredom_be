import jwt from 'jsonwebtoken'
import { UNAUTHORIZED_ACTION, VALIDATION_ERROR_MSG } from '../errors/error-messages.mjs'
import { UNAUTHORISED, VALIDATION_ERROR } from '../errors/error-types.mjs'
import { ObjectId } from 'mongodb'

async function postReview(review, parentReviewId, businessId, token, db){
    let userId = jwt.verify(token, process.env.JWT_SECRET).user_id
    let reviewsCollection = getReviewsCollection(db)
    let parentReview
    if(parentReviewId){
        parentReview = await reviewsCollection.findOne({_id: ObjectId.createFromHexString(parentReviewId)})
    }    
    validateReviewData({review: review, businessId: businessId, userId: userId}, db)

    let newReview = await reviewsCollection.insertOne({
        user_id: userId,
        review: review,
        business_id: businessId,
        creation_time: new Date()
    })
    
    if(parentReview){
        let childIds = [newReview.insertedId]
        if(parentReview.child_ids){
            childIds = [...parentReview.child_ids, ...childIds]
        }

        await reviewsCollection.updateOne({_id: parentReview._id}, {$set: {child_ids: [childIds]}})
    }
}

async function getReviews(businessId, db){
    console.log(businessId)
    let reviewsCollection = getReviewsCollection(db)
    return reviewsCollection.find({business_id: businessId}).toArray()
}

async function deleteReview(reviewId, token, db){
    let reviewsCollection = getReviewsCollection(db)
    let review = reviewsCollection.findOne({_id: ObjectId.createFromHexString(reviewId)})
    let userId = jwt.verify(token, process.env.JWT_SECRET)

    if(userId === review.user_id){
        reviewsCollection.deleteOne({_id: ObjectId.createFromHexString(reviewId)})
    }
    else{
        throw({type: UNAUTHORISED, message: UNAUTHORIZED_ACTION})
    }

    return
}

function getReviewsCollection(db){
    return db.collection('reviews')
}

async function validateReviewData(data, db){
    let businessDataCollection = db.collection('businessData')
    let businessData = await businessDataCollection.findOne({_id: ObjectId.createFromHexString(data.businessId)})

    if(!businessData || !data.review || data.review.length < 3 || businessData.admin_user_id === data.userId){
        throw(VALIDATION_ERROR, VALIDATION_ERROR_MSG)
    }

}

export default {postReview, getReviews, deleteReview}