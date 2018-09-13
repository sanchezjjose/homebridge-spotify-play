let Service;
let Characteristic;

const request = require('request');
 
module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-spotify-play", "Spotify", Spotify);
};

const sendPostRequest = (url, refreshToken, clientToken, log) => {
  return new Promise((resolve, reject) => {
    log(`Sending request to ${url}`);

    let req = {
      url: url,
      method: 'POST',
      form: {
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken,
      },
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${clientToken}`
      }
    };

    request(req, function (error, response, body) {
      if (error) {
        log(error.message);
        return reject(error);
      }

      return resolve(response);
    });
  });
};

const sendPutRequest = (url, accessToken, log, opts = {}) => {
  return new Promise((resolve, reject) => {
    log(`Sending request to ${url}`);

    let req = {
      url: url,
      method: 'PUT',
      body: opts.body,
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    request(req, function (error, response, body) {
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
    this.accessToken;
    this.tokenUrl = config['tokenUrl'];
    this.volumeUrl = config['volumeUrl'];
    this.shuffleUrl = config['shuffleUrl'];
    this.playUrl = config['playUrl'];
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

      sendPostRequest(this.tokenUrl, this.refreshToken, this.base64clientToken, this.log)
        .then(response => {
          this.log(`Setting volume on device...`);
          this.accessToken = JSON.parse(response.body).access_token;

          return sendPutRequest(`${this.volumeUrl}?device_id=${this.deviceId}`, this.accessToken, this.log);
        })
        .then(response => {
          this.log(`Shuffling Spotify playlist on device...`);
          this.on = true;

          return sendPutRequest(`${this.shuffleUrl}?device_id=${this.deviceId}`, this.accessToken, this.log);
        })
        .then(response => {
          this.log(`Starting Spotify playlist on device...`);

          const opts = {
            body: JSON.stringify({ 
              'context_uri': this.playlist,
              'offset': {
                'position': 5,
                'position_ms': 0  
              }
            }
          )};

          return sendPutRequest(`${this.playUrl}?device_id=${this.deviceId}`, this.accessToken, this.log, opts);
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
