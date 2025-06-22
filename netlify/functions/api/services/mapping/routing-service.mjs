import { INCORRECT_REQUEST_PARAMS } from "../../errors/error-types.mjs";
import { MESSAGE_INCORRECT_REQUEST_PARAMS_MAPPING } from "../../errors/error-messages.mjs";

    async function requestRouting(startLat, startLng, destinationLat, destinationLng){

        if(!startLat || !startLng || !destinationLat || !destinationLng){
            throw({type: INCORRECT_REQUEST_PARAMS, message: MESSAGE_INCORRECT_REQUEST_PARAMS_MAPPING})
        }

        let url = 'http://localhost:8080/ors/v2/directions/driving-car?'

        if(process.env.ENVIRONMENT !== 'local'){
            url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.ORS_API_KEY}&`
        }

        return fetch(`${url}start=${startLng}%2C${startLat}&end=${destinationLng}%2C${destinationLat}`)
        .then(data => data.json())
        .then(result => {
            if(!result || !result.features || !result.features[0] || !result.features[0].geometry || !result.features[0].geometry.coordinates){
                return []
            }
                    
            let coordinates = result.features[0].geometry.coordinates;

            // reverse coordinates to convert to [lat, lng] format
            coordinates.forEach(point => {
                point.reverse()
            })

            return {coordinates: coordinates};
        })
        
        
    }

    export default {requestRouting}