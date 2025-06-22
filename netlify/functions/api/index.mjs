// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2
import {MongoClient, ServerApiVersion } from 'mongodb'
import express from 'express'
import serverless from "serverless-http";
import dotenv from 'dotenv';
import cors from 'cors';
import userService from './services/user-service.mjs';
import { INCORRECT_REQUEST_BODY, INCORRECT_REQUEST_PARAMS, MISSING_REQUIRED_FIELDS } from './errors/error-types.mjs';
import { DUPLICATE_KEY_CODE } from './errors/mongo-error-types.mjs';
import { USERNAME_ALREADY_EXISTS } from './errors/error-messages.mjs';
import { MongoError } from 'mongodb'
import geocodingService from './services/mapping/geocoding-service.mjs'
import routingService from './services/mapping/routing-service.mjs'

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

app.get("/users", async(req, res) => {
    const database = (await clientPromise).db("kill_my_boredom")
    const collection = database.collection('users')
    const results = await collection.find({}).toArray();
    res.send(JSON.stringify(results))
})

app.post("/users", async (req, res, next) => {
    let userData = JSON.parse(req.body.toString()).userData;
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

app.get("/mapping/geocode/:searchStr", (req, res, next) => {
    let searchStr = req.params.searchStr
    geocodingService.requestGeocoding(searchStr)
    .then(result => res.send(JSON.stringify(result)))
    .catch(err => next(err))
})

app.get("/mapping/route", (req, res, next) => {
    let reqParams = req.query;
    routingService.requestRouting(reqParams.startLat, reqParams.startLng, reqParams.destinationLat, reqParams.destinationLng)
    .then(result => res.send(JSON.stringify(result)))
    .catch(err => next(err))
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
            default: res.status(500).send('Server could not process request. Please report the error for resolution.')
        }
    }
})

app.get("/", (req, res) => {
    res.send("Deployed")
})


// app.listen(8888, () => {
  
// })

export const handler = serverless(app)

// export default async (request, context) => {
//   try {

//     const database = (await clientPromise).db("kill_my_boredom")
//     const collection = await database.collection('users')
        
//     const results = await collection.find({}).toArray();

//     return new Response(JSON.stringify(results))
//   } catch (error) {
//     return new Response(error.toString(), {
//       status: 500,
//     })
//   }
// }
