# homebridge-spotify-play
## Example config.json
```
{
    "bridge": {
        "name": "Homebridge",
        "username": "CC:22:3D:E3:CE:32",
        "port": 51826,
        "pin": "031-45-154"
    },
    
    "description": "This is an example configuration file with one fake accessory and one fake platform. You can use this as a template for creating your own configuration file containing devices you actually own.",

    "accessories": [
        {
          "accessory": "Spotify",
          "name": "Spotify",
          "playlist": "spotify:user:abc123:playlist:xyz",
          "requestUrl": "https://api.spotify.com/v1/me/player/play?device_id=XXXX",
          "base64clientToken": "AAAAA",
          "refreshToken": "AAAAA"
        }
    ],

    "platforms": [

    ]
}
```
