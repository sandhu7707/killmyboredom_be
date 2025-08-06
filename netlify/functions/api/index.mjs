// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2
import {MongoClient, ServerApiVersion } from 'mongodb'
import express from 'express'
import serverless from "serverless-http";
import dotenv from 'dotenv';
import cors from 'cors';
import userService from './services/user-service.mjs';
import { INCORRECT_PASSWORD, INCORRECT_REQUEST_BODY, INCORRECT_REQUEST_PARAMS, MISSING_REQUIRED_FIELDS, UNAUTHORISED } from './errors/error-types.mjs';
import { DUPLICATE_KEY_CODE } from './errors/mongo-error-types.mjs';
import { USER_NOT_FOUND, USERNAME_ALREADY_EXISTS } from './errors/error-messages.mjs';
import { MongoError } from 'mongodb'
import geocodingService from './services/mapping/geocoding-service.mjs'
import routingService from './services/mapping/routing-service.mjs'
import businessService from './services/business-service.mjs';
import reviewService from './services/review-service.mjs'

dotenv.config();

const app = express()
app.use(cors())

const client = new MongoClient(process.env.ATLAS_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})
const clientPromise = client.connect()

app.get("/users/check-username-availability/", async(req, res) => {
    const username = req.query.username
    let db = (await clientPromise).db('kill_my_boredom')
    res.send({available: await userService.checkUsername(username, db)})
})

// app.post("/sign-in", express.json(), async(req, res, next) => {
app.post("/sign-in", async(req, res, next) => {
    let userData = JSON.parse(req.body.toString()).userData; 
    // let userData = req.body.userData
    const database = (await clientPromise).db("kill_my_boredom")
    userService.signUserIn(userData, database)
    .then(result => res.status(200).send(result))
    .catch(err => next(err))
})

// app.post("/users", express.json(), async (req, res, next) => {
app.post("/users", async (req, res, next) => {
    // let userData = req.body.userData
    let userData = JSON.parse(req.body.toString()).userData;                    //TODO: why not work here but does on netlify current deployment ? TODO: check if it still works with middleware
    let db = (await clientPromise).db("kill_my_boredom")
    userService.insertUser(userData, db)
    .then(() => res.status(200).send("User added successfully"))
    .catch(err => next(err))
})

app.put("/users", async(req, res, next) => {
    let userData = JSON.parse(req.body.toString()).userData;
    let db = (await clientPromise).db("kill_my_boredom")
    userService.updateUser(userData, db)
    .then(() => res.status(200).send('User data updated successfully'))
    .catch(err => next(err))
})

app.delete("/users", async(req, res, next) => {
    let userData = JSON.parse(req.body.toString()).userData;
    let db = (await clientPromise).db("kill_my_boredom")
    userService.deleteUser(userData, db)
    .then(() => res.status(200).send('User deleted successfully'))
    .catch(err => next(err))
})

app.put("/users/favorite", async(req, res, next) => {
    let body = JSON.parse(req.body.toString())
    let db = (await clientPromise).db('kill_my_boredom')
    userService.addFavorite(body.token, body.businessId, db)
    .then((user) => res.status(200).send(JSON.stringify({user: user})))
    .catch(err => next(err))
})

//TODO: this businessData thing...
// app.post('/businessData', express.json(), async(req, res, next) => {
app.post('/businessData', async(req, res, next) => {
    let businessData = JSON.parse(req.body.toString())
    // let businessData = req.body;
    let db = (await clientPromise).db("kill_my_boredom")
    businessService.saveBusinessData(businessData, db)
    .then(() => {
        res.status(200).send('Business data saved successfully')
    })
    .catch(err => {
        next(err)
    })
})

// app.put('/business-data', express.json(), async(req, res, next) => {
app.put('/business-data', async(req, res, next) => {
    
    let businessData = JSON.parse(req.body.toString())
    // let businessData = req.body;
    let db = (await clientPromise).db("kill_my_boredom")
    businessService.updateBusinessData(businessData, db)
    .then(() => {
        res.status(200).send('Updated successfully')
    })
    .catch(err => next(err))
})

app.get("/business-data/coords", async(req, res, next) => {
    let db = (await clientPromise).db('kill_my_boredom')
    businessService.fetchAllBusinessCoords(db)
    .then((data) => {
        res.status(200).send(JSON.stringify(data))
    })
    .catch(err => next(err))
})

app.get("/business-data/", async(req, res, next) => {
    const businessId = req.query.businessId
    let db = (await clientPromise).db('kill_my_boredom')
    businessService.fetchBusinessDataById(businessId, db)
    .then((data) => {
        if(!data){
            res.status(404).send()
        }
        else{
            res.status(200).send(JSON.stringify(data))
        }
    })
    .catch(err => next(err))
})

// app.post("/registered-businesses", express.json(), async(req, res, next) => {
app.post("/registered-businesses", async(req, res, next) => {
    
    const token = JSON.parse(req.body.toString()).token
    // const token = req.body.token
    let db = (await clientPromise).db('kill_my_boredom')
    businessService.fetchRegisteredBusinesses(token, db)
    .then(data => {
        if(!data){
            res.status(404).send()
        }
        else{
            res.status(200).send(data)
        }
    })
    .catch(err => {
        next(err)
    })
})

app.get("/mapping/geocode/:searchStr", (req, res, next) => {
    let searchStr = req.params.searchStr
    geocodingService.requestGeocoding(searchStr)
    .then(result => res.send(result))
    .catch(err => next(err))
})

app.get("/mapping/route", (req, res, next) => {
    let reqParams = req.query;
    routingService.requestRouting(reqParams.startLat, reqParams.startLng, reqParams.destinationLat, reqParams.destinationLng)
    .then(result => res.send(JSON.stringify(result)))
    .catch(err => next(err))
})

app.post("/reviews", async (req, res, next) => {
    let body = JSON.parse(req.body.toString())
    let db = (await clientPromise).db('kill_my_boredom')
    reviewService.postReview(body.review, body.parentReviewId, body.businessId, body.token, db)
    .then(result => res.status(200).send('Successfuly posted review'))
    .catch(err => next(err))
})

app.get('/reviews', async(req, res, next) => {
    let businessId = req.query.businessId
    let db = (await clientPromise).db('kill_my_boredom')
    reviewService.getReviews(businessId, db)
    .then(result => res.status(200).send(JSON.stringify(result)))
    .catch(err => next(err))  
})

app.delete('/reviews', async(req, res, next) => {
    let body = JSON.parse(req.body.toString())
    let db = (await clientPromise).db('kill_my_boredom')
    reviewService.deleteReview(body.reviewId, body.token, db)
    .then(() => res.status(200).send('deleted successfully'), (err) => next(err))
})

app.use((err, req, res, next) => {
    console.log('error handler invoked, err.type: ', err.type, ", err.message: ", err.message, ", complete error: \n", err)

    if(err instanceof MongoError){
        switch(err.code){
            case DUPLICATE_KEY_CODE: {
                res.status(409).send(USERNAME_ALREADY_EXISTS)
            }
        }
    }
    else if(err){
        switch(err.type){
            case MISSING_REQUIRED_FIELDS:
            case 'entity.parse.failed':
            case INCORRECT_REQUEST_PARAMS:
            case INCORRECT_REQUEST_BODY: {
                res.status(422).send(err.message)
                break
            }
            case INCORRECT_PASSWORD: 
            case USER_NOT_FOUND: {
                res.status(403).send(err.message)
                break
            }
            case UNAUTHORISED: {
                res.status(409).send(err.message)
                break
            }
            default: res.status(500).send('Server could not process request. Please report the error for resolution.')
        }
    }
})

app.get("/", (req, res) => {
    res.send("Deployed")
})


// app.listen(8888, () => {
//     console.log("listening on port 8888")
// })

export const handler = serverless(app)

