import axios, { Method as AxiosMethod, AxiosResponse } from "axios";
import fs from "fs";
import cookie from "cookie";
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

	protected session: string | null = null;

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
			log.info("Finished launchinggggggg");

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

	protected async initialContact(): Promise<void> {
		this.log("Sending initial request...");
		const response = await this.makeRequest("GET", "Data/0", {}, "ZWaveAPI");
	}

	// eslint-disable-next-line
	protected async makeRequest(
		method: AxiosMethod,
		url: string,
		data: Record<string, unknown> = {},
		base = "ZAutomation/api/v1",
	): Promise<AxiosResponse<any>> {
		if (this.session == null) {
			this.log("No requests have been made so far, looking for a session.");
			try {
				const fileContents = fs.readFileSync(
					this.api.user.storagePath() + "/." + PLUGIN_NAME + "-token",
					{
						encoding: "utf8",
					},
				);
				const parsedFile = JSON.parse(fileContents);
				const session = parsedFile.session;
				this.session = session;

				this.log(`Got session ${session.substring(0, 6)}...`);
				this.log("Testing access");

				const response = await axios({
					method: "GET",
					url: "status",
					data: JSON.stringify({}),

					baseURL: this.config.host + "ZAutomation/api/v1",
					withCredentials: true,
					responseType: "json",
					headers: {
						"Content-Type": "application/json",
						"User-Agent": "Homebridge " + PLATFORM_NAME,
						"Cookie": "ZWAYSession=" + session,
						"ZWAYSession": session,
					},
				});

				this.log("Success, session is valid!  Good to go!");
			} catch (e) {
				await this.makeNewLoginSession();
			}
		}
		return await axios({
			method: method,
			url: url,
			data: JSON.stringify(data),

			baseURL: this.config.host + base,
			withCredentials: true,
			responseType: "json",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Homebridge " + PLATFORM_NAME,
				"Cookie": "ZWAYSession=" + this.session,
				"ZWAYSession": this.session,
			},
			proxy: {
				host: "127.0.0.1",
				port: 8888,
			},
		});
	}

	async makeNewLoginSession(): Promise<void> {
		this.log("No session exists or session is invalid.  Trying to login");
		const response = await axios({
			method: "POST",
			url: "login",
			data: JSON.stringify({
				login: this.config.user,
				password: this.config.pass,
			}),

			baseURL: this.config.host + "ZAutomation/api/v1",
			withCredentials: true,
			responseType: "json",
			validateStatus: () => true,
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Homebridge " + PLATFORM_NAME,
			},
		});

		this.log(`Got a response ${response.status} (${response.statusText})`);

		if (response.status != 200) {
			this.log("This appears to be an error.  Please check your login information.");
			return;
		}

		this.log("Parsing cookie header(s)");
		const parsedCookie = cookie.parse(response.headers["set-cookie"][0]);
		const session = parsedCookie.ZWAYSession;
		this.session = session;
		const userId = response.data.data.id;

		this.log(`Got session ${session.substr(0, 6)}..., saving`);
		fs.writeFileSync(
			this.api.user.storagePath() + "/." + PLUGIN_NAME + "-token",
			JSON.stringify({
				session,
			}),
		);

		this.log("Trying to set session as non-expiring...");
		const extendExpiryResponse = await axios({
			method: "PUT",
			url: "profiles/" + userId + "/token/" + session.substr(0, 6) + "...",
			data: JSON.stringify({}),

			baseURL: this.config.host + "ZAutomation/api/v1",
			withCredentials: true,
			responseType: "json",
			validateStatus: () => true,
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Homebridge " + PLATFORM_NAME,
				"Cookie": "ZWAYSession=" + session,
				"ZWAYSession": session,
			},
		});

		if (extendExpiryResponse.status < 300) {
			this.log("Success");
			this.log(
				"If you would like, you can remove your password from the config file (set it to an empty string)",
			);
		} else {
			this.log("Unable to set as non-expiring.");
			this.log(
				"This platform may stop working or experience delays when needing to re-authenticate",
			);
		}
	}
}
