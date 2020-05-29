import {
	API,
	APIEvent,
	CharacteristicEventTypes,
	CharacteristicSetCallback,
	CharacteristicValue,
	DynamicPlatformPlugin,
	HAP,
	Logging,
	PlatformAccessory,
	PlatformAccessoryEvent,
	PlatformConfig,
} from "homebridge";

const PLUGIN_NAME = "homebridge-zway-schlage-be469";
const PLATFORM_NAME = "schlage-be469";

let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (api: API) => {
	hap = api.hap;
	Accessory = api.platformAccessory;

	api.registerPlatform(PLATFORM_NAME, ZWaySchlageBe469);
};

interface ZWaySchlageBe469Config extends PlatformConfig {
	host: string;
	user: string;
	pass: string;
}

class ZWaySchlageBe469 implements DynamicPlatformPlugin {
	protected readonly log: Logging;
	protected readonly api: API;

	protected readonly accessories: PlatformAccessory[] = [];

	protected config: {
		host: string;
		user: string;
		pass: string;
	};

	protected currentSession: string | null = null;

	constructor(log: Logging, config: PlatformConfig, api: API) {
		this.log = log;
		this.api = api;

		this.config = {
			host: (config as ZWaySchlageBe469Config).host,
			user: (config as ZWaySchlageBe469Config).user,
			pass: (config as ZWaySchlageBe469Config).pass,
		};

		log.info("Finished initializing!");

		/*
		 * When this event is fired, homebridge restored all cached accessories from disk and did call their respective
		 * `configureAccessory` method for all of them. Dynamic Platform plugins should only register new accessories
		 * after this event was fired, in order to ensure they weren't added to homebridge already.
		 * This event can also be used to start discovery of new accessories.
		 */
		api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
			log.info("Finished launching");

			this.initialContact();
		});
	}

	/*
	 * This function is invoked when homebridge restores cached accessories from disk at startup.
	 * It should be used to setup event handlers for characteristics and update respective values.
	 */
	configureAccessory(accessory: PlatformAccessory): void {
		this.log("Configuring accessory %s", accessory.displayName);

		// accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
		// 	this.log("%s identified!", accessory.displayName);
		// });

		// accessory
		// 	.getService(hap.Service.Lightbulb)!
		// 	.getCharacteristic(hap.Characteristic.On)
		// 	.on(
		// 		CharacteristicEventTypes.SET,
		// 		(value: CharacteristicValue, callback: CharacteristicSetCallback) => {
		// 			this.log.info("%s Light was set to: " + value);
		// 			callback();
		// 		},
		// 	);

		this.accessories.push(accessory);
	}

	// --------------------------- CUSTOM METHODS ---------------------------

	protected initialContact(): void {
		// todo
	}
}
