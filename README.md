# homebridge-zway-schlage-be469

A homebridge plugin to interact with Schlage BE469 locks through a Z-Way server.  I mostly built this as a learning experience and found the existing Z-Way Homebridge plugin to not be quite what I was looking for.

## My Setup
In my personal usage, I used a [RaZberry](https://smile.amazon.com/dp/B01M3Q764U/) on a Pi I had laying around.  It worked quite well once I enrolled my devices in the Z-Way dashboard.

I have two models: the newer BE469ZP and the older (regular?) BE469.  I'm not too sure what the defining characteristics are, however, the newer one has a dedicated Z-Wave enroll/unenroll button inside the cover and supports S2 Access.

For some reason, I had lots of issues with BE469ZP's association/lifeline settings.  However, on the regular BE469 I have I was able to setup Niffler within the Z-Way server and polling was no longer needed.

## Installation
Install this plugin using `npm i -g homebridge-zway-schlage-be469`.

Update the `config.json` file of your Homebridge setup to support this platform as described in the [Configuration](#configuration) section.

## Updating
Update to the latest release of this plugin using `npm i -g homebridge-zway-schlage-be469`.

## Configurations
Add the following to the Homebridge `config.json`:

```json5
{
    ...
    "platforms": [
        ...
        {
            "platform": "schlage-be469",
            "host": "http://your.host.here:port/",
            "user": "admin",
            "pass": "your-password-here",
            "ignore": [ nodes, to, ignore ],
            "toPoll": [ nodes, to, poll ]
        }
        ...
    ]
    ...
}
```

#### Parameters
* `host`: the IP/hostname of your Z-Way server and its port.  Be sure to add a trailing slash
* `user`: the username for the Z-Way instance
* `pass`: the password for the Z-Way instance
* `ignore`: Schlage lock nodes to ignore
* `toPoll`: nodes which should be polled for new information (e.g. association/lifeline is broken)
