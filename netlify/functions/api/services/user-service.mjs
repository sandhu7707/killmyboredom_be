import { MESSAGE_INCORRECT_REQUEST_BODY_USERS, MESSAGE_MISSING_REQUIRED_FIELDS_USERS } from "../errors/error-messages.mjs";
import { INCORRECT_REQUEST_BODY, MISSING_REQUIRED_FIELDS } from "../errors/error-types.mjs";

    async function insertUser(userData, db){ 
        let usersCollection = db.collection('users');
        validateUserData(userData)

        let user = {
            _id: userData.username,
            username: userData.username,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            password: userData.password
        }

        return usersCollection.insertOne(user)
    }

    async function updateUser(userData, db){
        let usersCollection = db.collection('users');
        validateUserData(userData)
        
        let userUpdates = {}

        if(userData.email){
            userUpdates.email = userData.email
        }
        if(userData.phoneNumber){
            userUpdates.phoneNumber = userData.phoneNumber
        }
        if(userData.password){
            userUpdates.password = userData.password
        }

        return usersCollection.updateOne({_id: userData.username}, { $set: {...userUpdates}})
        
    }

    async function deleteUser(userData, db){
        let usersCollection = db.collection('users');
        validateUserData(userData)
        return usersCollection.deleteOne({username: userData.username})
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

export default {insertUser, updateUser, deleteUser}