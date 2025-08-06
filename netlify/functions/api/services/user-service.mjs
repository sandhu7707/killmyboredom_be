import { MESSAGE_INCORRECT_REQUEST_BODY_USERS, MESSAGE_MISSING_REQUIRED_FIELDS_USERS, PASSWORD_IS_INCORRECT } from "../errors/error-messages.mjs";
import { INCORRECT_PASSWORD, INCORRECT_REQUEST_BODY, MISSING_REQUIRED_FIELDS, USER_NOT_FOUND } from "../errors/error-types.mjs";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

    async function checkUsername(username, db){
        if(!username){
            throw({type: MISSING_REQUIRED_FIELDS, message: MESSAGE_MISSING_REQUIRED_FIELDS_USERS})
        }

        let usersCollection = db.collection('users');
        
        return usersCollection.find({'username': username}).toArray()
        .then(result => result.length === 0)
    }

    async function insertUser(userData, db){ 
        let usersCollection = db.collection('users');
        validateUserData(userData)

        const password = await bcrypt.hash(userData.password, 10)

        let user = {
            _id: userData.username,
            username: userData.username,
            email: userData.email,
            phoneNumber: userData.phone,
            password: password
        }

        return usersCollection.insertOne(user)
    }

    async function updateUser(userData, db){
        let usersCollection = db.collection('users');
        validateUserData(userData)
        
        let userUpdates = {}

        const password = await bcrypt.hash(userData.password, 10)

        if(userData.email){
            userUpdates.email = userData.email
        }
        if(userData.phoneNumber){
            userUpdates.phoneNumber = userData.phoneNumber
        }
        if(userData.password){
            userUpdates.password = password
        }

        return usersCollection.updateOne({_id: userData.username}, { $set: {...userUpdates}})
        
    }

    async function signUserIn(userData, db){
        let usersCollection = db.collection('users');
        validateUserData(userData)

        let user = await usersCollection.findOne({_id: userData.username})
        if(!user){
            throw({type: USER_NOT_FOUND, message: USER_NOT_FOUND})
        }
        if(await bcrypt.compare(userData.password, user.password)){
            let token = jwt.sign({user_id: user._id}, process.env.JWT_SECRET)      //TODO: when jwt expires, logout somehow
            return {
                user: {
                    username: user.username,
                    email: user.email,
                    phone: user.phoneNumber,
                    favorites: user.favorites
                },
                token: token
            }
        }
        else{
            throw({type: INCORRECT_PASSWORD, message: PASSWORD_IS_INCORRECT})
        }
    }

    async function deleteUser(userData, db){
        let usersCollection = db.collection('users');
        validateUserData(userData)
        return usersCollection.deleteOne({username: userData.username})
    }

    async function addFavorite(token, businessId, db){
        let userId = jwt.verify(token, process.env.JWT_SECRET).user_id
        let usersCollection = db.collection('users');
        let user = await usersCollection.findOne({_id: userId})

        let favorites = user.favorites
        if(user.favorites && favorites.includes(businessId)){
            favorites.splice(favorites.findIndex(it => it === businessId),1)
        }
        else if(user.favorites){
            favorites.push(businessId)
        } 
        else{
            favorites = [businessId]
        }

        await usersCollection.updateOne({_id: user._id}, {$set: {favorites: favorites}})
        
        return {
                    username: user.username,
                    email: user.email,
                    phone: user.phoneNumber,
                    favorites: favorites
                }
    }

    function validateUserData(userData){
        let username, password;
        try{
            username = userData.username;
            password = userData.password;
        }
        catch(err){
            throw({type: INCORRECT_REQUEST_BODY, message: MESSAGE_INCORRECT_REQUEST_BODY_USERS})
        }

        if(!username || !password){
            throw({type: MISSING_REQUIRED_FIELDS, message: MESSAGE_MISSING_REQUIRED_FIELDS_USERS})
        }

    }

export default {insertUser, updateUser, deleteUser, checkUsername, signUserIn, addFavorite}