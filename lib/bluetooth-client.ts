import { BLE_COMMAND, BLE_SERVICE, BLE_TELEMETRY, TelemetryDecoder, type Telemetry } from "./robot-protocol";

export interface GattCharacteristic extends EventTarget {
  value?: DataView; properties:{read?:boolean};
  startNotifications():Promise<GattCharacteristic>; stopNotifications():Promise<GattCharacteristic>;
  readValue():Promise<DataView>; writeValueWithResponse(value:Uint8Array):Promise<void>;
}
export interface BleDevice extends EventTarget {
  name?:string; gatt?:{connected:boolean;connect():Promise<{getPrimaryService(id:string):Promise<{getCharacteristic(id:string):Promise<GattCharacteristic>}>}>;disconnect():void};
}
export interface BluetoothAdapter { requestDevice(options:unknown):Promise<BleDevice> }
export class RobotBluetoothClient {
  private device:BleDevice|null=null;
  private characteristic:GattCharacteristic|null=null;
  private command:GattCharacteristic|null=null;
  private decoder=new TelemetryDecoder();
  private generation=0;
  private onDisconnected=()=>{this.disconnect();this.disconnected()};
  private onValue=(event:Event)=>{
    const value=(event.target as GattCharacteristic).value;
    if(!value)return;
    try{this.decoder.push(value,()=>this.error("invalid_packet")).forEach(packet=>this.receive(packet))}
    catch{this.error("invalid_packet")}
  };
  constructor(private receive:(packet:Telemetry)=>void,private disconnected:()=>void,private error:(code:string)=>void){}
  async connect(adapter:BluetoothAdapter) {
    this.disconnect();
    const generation=this.generation;
    let device:BleDevice;
    try {
      device=await adapter.requestDevice({filters:[{services:[BLE_SERVICE]},{namePrefix:"RiverPulse-RC-01"}],optionalServices:[BLE_SERVICE]});
    } catch(error) {
      if(error instanceof DOMException&&error.name==="NotFoundError")throw new Error("cancelled");
      throw error;
    }
    const check=()=>{if(generation!==this.generation)throw new Error("connection_cancelled")};
    check();
    this.device=device;
    device.addEventListener("gattserverdisconnected",this.onDisconnected);
    try {
      if(!device.gatt)throw new Error("gatt_unavailable");
      const server=await device.gatt.connect();check();
      const service=await server.getPrimaryService(BLE_SERVICE);
      check();
      const characteristic=await service.getCharacteristic(BLE_TELEMETRY);check();
      this.characteristic=characteristic;
      const command=await service.getCharacteristic(BLE_COMMAND);check();
      this.command=command;
      this.characteristic.addEventListener("characteristicvaluechanged",this.onValue);
      await this.characteristic.startNotifications();
      check();
      return device.name??"RiverPulse RC-01";
    } catch(error) {
      if(generation===this.generation)this.disconnect();
      else if(this.device!==device)device.gatt?.disconnect();
      throw error;
    }
  }
  async stop(id:string) {
    if(!/^[0-9a-f]{8}$/i.test(id))throw new Error("invalid_command_id");
    if(!this.device?.gatt?.connected||!this.command)throw new Error("not_connected");
    // Fits the default 20-byte BLE payload. Firmware replies with matching ack.id.
    await this.command.writeValueWithResponse(new TextEncoder().encode("STOP:"+id));
    return id;
  }
  private cleanup() {
    this.characteristic?.removeEventListener("characteristicvaluechanged",this.onValue);
    this.device?.removeEventListener("gattserverdisconnected",this.onDisconnected);
    this.characteristic=null;this.command=null;this.decoder.reset();
  }
  disconnect() { this.generation++;this.cleanup();this.device?.gatt?.disconnect();this.device=null; }
}
