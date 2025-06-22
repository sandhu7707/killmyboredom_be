import { MESSAGE_INCORRECT_REQUEST_PARAMS_MAPPING } from "../../errors/error-messages.mjs";
import { INCORRECT_REQUEST_PARAMS } from "../../errors/error-types.mjs";

    async function requestGeocoding(searchStr){
        if(!searchStr){
            throw({type: INCORRECT_REQUEST_PARAMS, message: MESSAGE_INCORRECT_REQUEST_PARAMS_MAPPING})
        }

        if(process.env.ENVIRONMENT=='local'){
            return requestGeocodingSelfHostedNominatim(searchStr)
        }
        else{
            return requestGeocodingGeoapify(searchStr)
        }

    }

    async function requestGeocodingGeoapify(searchStr){
        return fetch("https://api.geoapify.com/v1/geocode/search?text="+ encodeURIComponent(searchStr) +`&apiKey=${process.env.GEOAPIFY_GEOCODING_API_KEY}`,
                            {method: 'GET'}
                        )
                    .then(response => response.json())
                    .then(data => data.features.map(it => {
                        return {
                            bbox: [[it.bbox[1], it.bbox[0]], [it.bbox[3], it.bbox[2]]],
                            lng: it.properties.lon,
                            lat: it.properties.lat,
                            name: it.properties.name,
                            displayname: it.properties.address_line1 ? it.properties.address_line1 + ", " + it.properties.address_line2 : it.properties.name
                        }
                    }))
                    .catch(error => console.log(error))
    }

    async function requestGeocodingSelfHostedNominatim(searchStr){
        return fetch("http://localhost:9090/search?q=" + encodeURIComponent(searchStr))
                    .then(response => response.json())
                    .then(
                        data => data.map(it => {
                                    return {
                                        bbox: [it.boundingbox[0], it.boundingbox[2], it.boundingbox[1], it.boundingbox[3]],
                                        lng: it.lon,
                                        lat: it.lat,
                                        name: it.name,
                                        displayname: it.display_name ? it.display_name : it.name
                                    }
                                })
                    )
                    .catch(error => console.log(error))
    }


    export default {requestGeocoding}