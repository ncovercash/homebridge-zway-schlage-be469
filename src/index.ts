import axios, { Method as AxiosMethod, AxiosResponse } from "axios";
import fs from "fs";
import cookie from "cookie";
import diff from "fast-array-diff";
import {
	API,
	APIEvent,
	Categories,
	CharacteristicEventTypes,
	CharacteristicGetCallback,
	CharacteristicSetCallback,
	CharacteristicValue,
	DynamicPlatformPlugin,
	HAP,
	Logging,
	PlatformAccessory,
	PlatformAccessoryEvent,
	PlatformConfig,
} from "homebridge";
import { Be469Device, CommandClassIds, DataAPIReponse, ZWaySchlageBe469Config } from "./types";

const PLUGIN_NAME = "homebridge-zway-schlage-be469";
const PLATFORM_NAME = "schlage-be469";

let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (api: API) => {
	hap = api.hap;
	Accessory = api.platformAccessory;

	api.registerPlatform(PLATFORM_NAME, ZWaySchlageBe469);
};

class ZWaySchlageBe469 implements DynamicPlatformPlugin {
	protected readonly log: Logging;
	protected readonly api: API;

	protected readonly accessories: Record<number, PlatformAccessory> = {};

	protected config: {
		host: string;
		user: string;
		pass: string;
	};

	protected session: string | null = null;
	protected locks: Record<number, Be469Device> = {};

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
		api.on(APIEvent.DID_FINISH_LAUNCHING, async () => {
			log.info("Finished launching");

			await this.initialContact();

			const delta = diff.diff(Object.keys(this.accessories), Object.keys(this.locks));

			delta.added.forEach((nodeKey) => {
				const nodeId = parseInt(nodeKey);

				this.log("Creating accessory for lock #" + nodeId);

				let name = this.locks[nodeId].lastState.data.givenName.value as string;
				if (name == "") {
					this.log.warn(
						"This lock does not have a name set in Z-Way.  Defaulting to Allegion Keypad",
					);
					name = "Allegion Keypad";
				}

				const uuid = hap.uuid.generate(nodeKey);
				const accessory = new Accessory(name, uuid, Categories.DOOR_LOCK);
				accessory.context.nodeId = nodeId;

				accessory.addService(hap.Service.LockMechanism, name);
				accessory.addService(hap.Service.LockManagement, name);

				this.configureAccessory(accessory);
				this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
			});
			delta.removed.forEach((nodeKey) => {
				const nodeId = parseInt(nodeKey);

				this.log("Lock #" + nodeId + " removed");

				this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
					this.accessories[nodeId],
				]);

				delete this.accessories[nodeId];
			});
		});
	}

	/*
	 * This function is invoked when homebridge restores cached accessories from disk at startup.
	 * It should be used to setup event handlers for characteristics and update respective values.
	 */
	configureAccessory(accessory: PlatformAccessory): void {
		this.log(
			`Configuring accessory ${accessory.displayName} with node ID ${accessory.context.nodeId}`,
		);

		accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
			this.log(`#${accessory.context.nodeId} identified!`);
		});

		const mechanismService = accessory.getService(hap.Service.LockMechanism)!;
		mechanismService
			.getCharacteristic(hap.Characteristic.LockCurrentState)
			.on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
				this.log.info("Requested get for current");
				callback(null, hap.Characteristic.LockTargetState.UNSECURED);
			});
		mechanismService
			.getCharacteristic(hap.Characteristic.LockTargetState)
			.on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
				this.log.info("Requested get for target");
				callback(null, hap.Characteristic.LockTargetState.UNSECURED);
			})
			.on(
				CharacteristicEventTypes.SET,
				(value: CharacteristicValue, callback: CharacteristicSetCallback) => {
					this.log.info("Requested set for target: " + value);
					callback(null, hap.Characteristic.LockTargetState.UNSECURED);
				},
			);

		const managementService = accessory.getService(hap.Service.LockManagement)!;
		managementService
			.getCharacteristic(hap.Characteristic.LockControlPoint)
			.on(
				CharacteristicEventTypes.SET,
				(value: CharacteristicValue, callback: CharacteristicSetCallback) => {
					this.log.info("Tried writing to management service: " + value);
					callback(new Error("Does nothing"));
				},
			);
		managementService
			.getCharacteristic(hap.Characteristic.LockControlPoint)
			.on(
				CharacteristicEventTypes.SET,
				(value: CharacteristicValue, callback: CharacteristicSetCallback) => {
					this.log.info("Tried writing to management service: " + value);
					callback(new Error("Does nothing"));
				},
			);
		managementService
			.getCharacteristic(hap.Characteristic.Version)
			.updateValue("1.0")
			.on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
				callback(null, "1.0");
			});

		this.accessories[accessory.context.nodeId] = accessory;
	}

	// --------------------------- CUSTOM METHODS ---------------------------

	protected async initialContact(): Promise<void> {
		this.log("Sending initial request to enumerate devices...");
		const response = await this.getData();

		this.log(`Your controller appears to be a ${response.data.controller.data.vendor.value}!`);

		Object.keys(response.data.devices).forEach((nodeId) => {
			const device = response.data.devices[nodeId];
			this.log(
				`Found #${nodeId}:`,
				`${device.data.givenName.value}`,
				`(${device.data.vendorString.value}`,
				`${device.data.deviceTypeString.value})`,
			);

			if (
				device.data.vendorString.value == "Allegion" &&
				device.data.deviceTypeString.value == "Secure Keypad"
			) {
				this.log("Identified this as a lock to be served by this platform");
			} else {
				return;
			}

			const lock: Be469Device = {
				nodeId: parseInt(nodeId),
				commandClasses: {
					alarm: { instance: 0 },
					battery: { instance: 0 },
					doorLock: { instance: 0 },
				},
				lastState: device,
			};

			Object.keys(device.instances).forEach((instanceId) => {
				const instance = device.instances[instanceId];
				Object.keys(instance.commandClasses).forEach((commandClassId) => {
					const commandClass = instance.commandClasses[commandClassId as CommandClassIds]!;
					switch (commandClassId as CommandClassIds) {
						case CommandClassIds.Alarm:
							lock.commandClasses.alarm.instance = parseInt(instanceId);
							this.log(`  -- Found relevant command class [${instanceId}] ${commandClass.name}`);
							break;
						case CommandClassIds.Battery:
							lock.commandClasses.battery.instance = parseInt(instanceId);
							this.log(`  -- Found relevant command class [${instanceId}] ${commandClass.name}`);
							break;
						case CommandClassIds.DoorLock:
							lock.commandClasses.doorLock.instance = parseInt(instanceId);
							this.log(`  -- Found relevant command class [${instanceId}] ${commandClass.name}`);
							break;
					}
				});
			});

			this.locks[parseInt(nodeId)] = lock;
		});
	}

	// eslint-disable-next-line
	protected async makeRequest<T = any>(
		method: AxiosMethod,
		url: string,
		data: Record<string, unknown> = {},
		base = "ZAutomation/api/v1",
	): Promise<AxiosResponse<T>> {
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

				await axios({
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
		});
	}

	protected getData(): Promise<AxiosResponse<DataAPIReponse>> {
		return this.makeRequest<DataAPIReponse>("GET", "Data/0", {}, "ZWaveAPI");
	}

	protected async makeNewLoginSession(): Promise<void> {
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
