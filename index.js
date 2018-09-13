let Service;
let Characteristic;

const request = require('request');
 
module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-spotify-play", "Spotify", Spotify);
};

const sendRequest = (requestObj, log) => {
  return new Promise((resolve, reject) => {
    log(`Sending request to ${requestObj.url}`);

    request(requestObj, function (error, response, body) {
      if (error) {
        log(error.message);
        return reject(error);
      }

      return resolve(response);
    });
  });
};

class Spotify {

  constructor(log, config) {
    this.on = false;
    this.log = log;
    this.requestUrl = config['requestUrl'];
    this.deviceId = config['deviceId'];
    this.base64clientToken = config['base64clientToken'];
    this.refreshToken = config['refreshToken'];
    this.playlist = config['playlist'];
  }

  getServices() {
    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Amazon")
      .setCharacteristic(Characteristic.Model, "Alexa")
      .setCharacteristic(Characteristic.SerialNumber, "XXXXXX");
 
    let switchService = new Service.Switch("Spotify");
    switchService
      .getCharacteristic(Characteristic.On)
        .on('get', this.getSwitchOnCharacteristic.bind(this))
        .on('set', this.setSwitchOnCharacteristic.bind(this));
 
    this.informationService = informationService;
    this.switchService = switchService;

    return [informationService, switchService];
  }

  getSwitchOnCharacteristic(next) {
    this.log('Getting Spotify status...');
    next(null, this.on);
  }
  
  setSwitchOnCharacteristic(on, next) {

    if (on) {
      this.log('Getting Spotify access token...');
    
      let requestObj = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'POST',
        form: {
          'grant_type': 'refresh_token',
          'refresh_token': this.refreshToken,
        },
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${this.base64clientToken}`
        }
      };

      // Get Spotify access token first.
      sendRequest(requestObj, this.log)
        .then(response => {
          this.log(`Setting volume on device...`);

          let accessToken = JSON.parse(response.body).access_token;
          this.log('accessToken: ', accessToken);

          let requestObj = {
            url: `https://api.spotify.com/v1/me/player/volume?volume_percent=25&device_id=${this.deviceId}`,
            method: 'PUT',
            headers: {
              'Accept': 'application/json',
              'Content-type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          };

          // Set volume on Alexa device.
          return sendRequest(requestObj, this.log);
        })
        .then(response => {
          this.log(`Shuffling Spotify playlist on device...`);

          this.on = true;

          let requestObj = {
            url: 'https://api.spotify.com/v1/me/player/shuffle?state=true',
            method: 'PUT',
            headers: {
              'Accept': 'application/json',
              'Content-type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          };

          // Shuffle Spotify playlist on Alexa device.
          return sendRequest(requestObj, this.log);
        })
        .then(response => {
          this.log(`Starting Spotify playlist on device...`);

          let requestObj = {
            url: this.requestUrl,
            method: 'PUT',
            body: JSON.stringify({ 
              'context_uri': this.playlist,
              'offset': {
                'position': 5,
                'position_ms': 0  
              }
            }),
            headers: {
              'Accept': 'application/json',
              'Content-type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          };

          // Play Spotify playlist on Alexa device.
          return sendRequest(requestObj, this.log);
        })
        .then(response => {
          this.log(`Successfully started Spotify playlist ${this.playlist}`);
          next();

        }).catch(err => {
          this.log('Error attempting to play Spotify playlist.', err);
          next(err);
        });

    } else {
      this.on = false;
      this.log('Turning off Spotify playlist...');
      next();
    }
  }
};
