import { PlatformConfig } from "homebridge";

export interface ZWaySchlageBe469Config extends PlatformConfig {
	user: string;
	pass: string;
	host: string;
	ignore: number[];
	nuke?: any;
}

export interface Be469Device {
	nodeId: number;
	commandClasses: {
		configuration: { instance: number };
		battery: { instance: number };
		doorLock: { instance: number };
	};
	lastState: Device;
}

export const ConfigurationOptions: Record<string, number> = {
	Beeper: 0x03,
	VacationMode: 0x04,
};

export enum CommandClassIds {
	NoOperation = "0",
	Basic = "32",
	ControllerReplication = "33",
	ApplicationStatus = "34",
	ZipServices = "35",
	ZipServer = "36",
	SwitchBinary = "37",
	SwitchMultilevel = "38",
	SwitchMultilevelV2 = "38",
	SwitchAll = "39",
	SwitchToggleBinary = "40",
	SwitchToggleMultilevel = "41",
	ChimneyFan = "42",
	SceneActivation = "43",
	SceneActuatorConf = "44",
	SceneControllerConf = "45",
	ZipClient = "46",
	ZipAdvServices = "47",
	SensorBinary = "48",
	SensorMultilevel = "49",
	SensorMultilevelV2 = "49",
	Meter = "50",
	ZipAdvServer = "51",
	ZipAdvClient = "52",
	MeterPulse = "53",
	MeterTblConfig = "60",
	MeterTblMonitor = "61",
	MeterTblPush = "62",
	ThermostatHeating = "56",
	ThermostatMode = "64",
	ThermostatOperatingState = "66",
	ThermostatSetpoint = "67",
	ThermostatFanMode = "68",
	ThermostatFanState = "69",
	ClimateControlSchedule = "70",
	ThermostatSetback = "71",
	DoorLockLogging = "76",
	ScheduleEntryLock = "78",
	BasicWindowCovering = "80",
	MtpWindowCovering = "81",
	AssociationGrpInfo = "89",
	DeviceResetLocally = "90",
	CentralScene = "91",
	IpAssociation = "92",
	Antitheft = "93",
	ZwaveplusInfo = "94",
	MultiChannelV2 = "96",
	MultiInstance = "96",
	DoorLock = "98",
	UserCode = "99",
	BarrierOperator = "102",
	Configuration = "112",
	ConfigurationV2 = "112",
	Alarm = "113",
	ManufacturerSpecific = "114",
	Powerlevel = "115",
	Protection = "117",
	ProtectionV2 = "117",
	Lock = "118",
	NodeNaming = "119",
	FirmwareUpdateMd = "122",
	GroupingName = "123",
	RemoteAssociationActivate = "124",
	RemoteAssociation = "125",
	Battery = "128",
	Clock = "129",
	Hail = "130",
	WakeUp = "132",
	WakeUpV2 = "132",
	Association = "133",
	AssociationV2 = "133",
	Version = "134",
	Indicator = "135",
	Proprietary = "136",
	Language = "137",
	Time = "138",
	TimeParameters = "139",
	GeographicLocation = "140",
	Composite = "141",
	MultiChannelAssociationV2 = "142",
	MultiInstanceAssociation = "142",
	MultiCmd = "143",
	EnergyProduction = "144",
	ManufacturerProprietary = "145",
	ScreenMd = "146",
	ScreenMdV2 = "146",
	ScreenAttributes = "147",
	ScreenAttributesV2 = "147",
	SimpleAvControl = "148",
	AvContentDirectoryMd = "149",
	AvRendererStatus = "150",
	AvContentSearchMd = "151",
	Security = "152",
	AvTaggingMd = "153",
	IpConfiguration = "154",
	AssociationCommandConfiguration = "155",
	SensorAlarm = "156",
	SilenceAlarm = "157",
	SensorConfiguration = "158",
	Mark = "239",
	NonInteroperable = "240",
}
type CommandClassId = CommandClassIds;

interface TypedAPIValue<N, T> {
	type: N;
	value: T;
	invalidTime: number;
	updateTime: number;
}

export type APIValue =
	| TypedAPIValue<"binary", number[]>
	| TypedAPIValue<"bool", boolean>
	| TypedAPIValue<"empty", null>
	| TypedAPIValue<"int", number>
	| TypedAPIValue<"string", string>;

// From /ZWaveAPI/Data/0
// by no means exhaustive
type CommandClassData = {
	value: any;
	type: any;
	supported: APIValue;
	version: APIValue;
	security: APIValue;
	interviewDone: APIValue;
	interviewCounter: APIValue;
	lastChange: APIValue;
	history: APIValue;
	last: APIValue;
	invalidTime: number;
	updateTime: number;
};

export interface CommandClass {
	name: string;
	data: CommandClassData;
}

export interface SpecialCommandClassIntermediate<N extends string, T extends string>
	extends CommandClass {
	name: N;
	data: CommandClassData &
		{
			[index in T]: APIValue;
		};
}

export type ConfigurationCommandClass = SpecialCommandClassIntermediate<"Configuration", "3" | "4">;
export type BatteryCommandClass = SpecialCommandClassIntermediate<"Battery", never>;
export type DoorLockCommandClass = SpecialCommandClassIntermediate<
	"DoorLock",
	| "mode"
	| "insideMode"
	| "outsideMode"
	| "lockMinutes"
	| "lockSeconds"
	| "condition"
	| "insideState"
	| "outsideState"
	| "timeoutMinutes"
	| "timeoutSeconds"
	| "opType"
>;

type DeviceDataKeys =
	| "basicType"
	| "genericType"
	| "specificType"
	| "infoProtocolSpecific"
	| "deviceTypeString"
	| "isVirtual"
	| "isListening"
	| "isRouting"
	| "isAwake"
	| "optional"
	| "isFailed"
	| "sensor250"
	| "sensor1000"
	| "neighbours"
	| "manufacturerId"
	| "vendorString"
	| "manufacturerProductType"
	| "manufacturerProductId"
	| "ZWLib"
	| "ZWProtocolMajor"
	| "ZWProtocolMinor"
	| "SDK"
	| "applicationMajor"
	| "applicationMinor"
	| "nodeInfoFrame"
	| "ZDDXMLFile"
	| "lastSend"
	| "lastNonceGet"
	| "lastReceived"
	| "failureCount"
	| "keepAwake"
	| "queueLength"
	| "priorityRoutes"
	| "givenName"
	| "interviewDone"
	| "secureChannelEstablished"
	| "securityS2ExchangedKeys";

export interface Device {
	data: APIValue &
		{
			[key in DeviceDataKeys]: APIValue;
		};
	instances: {
		[key: string]: {
			data: any;
			commandClasses: {
				[id in CommandClassId]?: CommandClass;
			};
		};
	};
}

type ControllerDataKeys =
	| "nodeId"
	| "homeId"
	| "SUCNodeId"
	| "isPrimary"
	| "isInOthersNetwork"
	| "isRealPrimary"
	| "isSUC"
	| "SISPresent"
	| "libType"
	| "SDK"
	| "ZWlibMajor"
	| "ZWlibMinor"
	| "ZWLib"
	| "ZWVersion"
	| "ZWaveChip"
	| "APIVersion"
	| "APIVersionMajor"
	| "APIVersionMinor"
	| "manufacturerId"
	| "vendor"
	| "manufacturerProductType"
	| "manufacturerProductId"
	| "bootloaderCRC"
	| "firmwareCRC"
	| "capabilities"
	| "controllerState"
	| "nonManagmentJobs"
	| "lastIncludedDevice"
	| "lastExcludedDevice"
	| "secureInclusion"
	| "oldSerialAPIAckTimeout10ms"
	| "oldSerialAPIByteTimeout10ms"
	| "curSerialAPIAckTimeout10ms"
	| "curSerialAPIByteTimeout10ms"
	| "countJobs"
	| "memoryGetAddress"
	| "memoryGetData"
	| "memoryManufacturerId"
	| "memoryType"
	| "memoryCapacity"
	| "functionClasses"
	| "functionClassesNames"
	| "softwareRevisionVersion"
	| "softwareRevisionId"
	| "softwareRevisionDate"
	| "uuid"
	| "caps"
	| "capsNonce"
	| "countDown"
	| "frequency"
	| "deviceRelaxDelay"
	| "statistics"
	| "homeName"
	| "homeNotes"
	| "S2RequireCSA"
	| "smartStart";

export interface DataAPIReponse {
	controller: {
		data: APIValue &
			{
				[key in ControllerDataKeys]: APIValue;
			};
	};
	devices: {
		[nodeId: string]: Device;
	};
	updateTime: number;
}
