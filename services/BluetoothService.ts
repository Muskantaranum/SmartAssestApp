import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

class BluetoothService {
  private bleManager: BleManager | null = null;
  private device: Device | null = null;
  private isScanning: boolean = false;
  private onDataReceived: ((data: string) => void) | null = null;
  private onDeviceFound: ((device: Device) => void) | null = null;

  constructor() {
    this.initializeBleManager();
  }

  private initializeBleManager() {
    if (this.bleManager === null) {
      console.log('Initializing BLE Manager');
      this.bleManager = new BleManager();
    }
  }

  private async ensureBleManager() {
    if (this.bleManager === null) {
      console.log('BLE Manager was null, reinitializing...');
      this.initializeBleManager();
    }

    try {
      const state = await this.bleManager?.state();
      console.log('BLE Manager State:', state);
      
      if (state === State.PoweredOff) {
        throw new Error('Bluetooth is turned off');
      }
    } catch (error) {
      console.error('BLE Manager state check failed:', error);
      this.bleManager = null;
      this.initializeBleManager();
    }
  }

  // Request necessary permissions for Android
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  }

  // Start scanning for devices
  async startScan(onDeviceFound: (device: Device) => void): Promise<void> {
    try {
      if (this.isScanning) {
        console.log('Already scanning, stopping previous scan...');
        this.stopScan();
      }

      console.log('Starting BLE Manager initialization...');
      await this.ensureBleManager();
      console.log('BLE Manager initialized successfully');

      console.log('Checking Bluetooth permissions...');
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.error('Bluetooth permissions not granted');
        throw new Error('Bluetooth permissions not granted');
      }
      console.log('Bluetooth permissions granted');

      this.onDeviceFound = onDeviceFound;
      this.isScanning = true;

      if (!this.bleManager) {
        console.error('BLE Manager is null after initialization');
        throw new Error('BLE Manager not initialized');
      }

      // Log the current state of the BLE manager
      const state = await this.bleManager.state();
      console.log('BLE Manager State:', state, 'State name:', State[state]);

      if (state !== State.PoweredOn) {
        console.error('Bluetooth is not in PoweredOn state. Current state:', State[state]);
        throw new Error(`Bluetooth is not ready. Current state: ${State[state]}`);
      }

      console.log('Starting device scan...');
      // Start scanning with all devices
      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Scan error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
          return;
        }

        if (device) {
          const deviceInfo = {
            name: device.name,
            id: device.id,
            rssi: device.rssi,
            isConnectable: device.isConnectable,
            mtu: device.mtu,
            manufacturerData: device.manufacturerData,
            serviceData: device.serviceData,
            serviceUUIDs: device.serviceUUIDs,
          };
          console.log('Found device details:', JSON.stringify(deviceInfo, null, 2));

          // Check if this is our target device
          if (device.name) {
            const deviceNameLower = device.name.toLowerCase();
            const targetNameLower = 'esp32_scale_bt'.toLowerCase();
            console.log('Comparing device names:', {
              deviceName: deviceNameLower,
              targetName: targetNameLower,
              isMatch: deviceNameLower.includes(targetNameLower)
            });

            if (deviceNameLower.includes(targetNameLower)) {
              console.log('Found target device:', device.name);
              this.onDeviceFound?.(device);
            }
          }
        }
      });

      // Log connected devices
      try {
        const connectedDevices = await this.bleManager.connectedDevices([]);
        console.log('Currently connected devices:', connectedDevices.map(d => ({
          name: d.name,
          id: d.id,
          isConnected: d.isConnected,
          services: d.services
        })));
      } catch (error) {
        console.error('Error getting connected devices:', error);
      }
    } catch (error) {
      console.error('Error in startScan:', error);
      this.isScanning = false;
      throw error;
    }
  }

  // Stop scanning
  stopScan(): void {
    if (this.isScanning && this.bleManager) {
      console.log('Stopping scan...');
      try {
        this.bleManager.stopDeviceScan();
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
      this.isScanning = false;
      this.onDeviceFound = null;
    }
  }

  // Connect to a device
  async connectToDevice(device: Device): Promise<void> {
    try {
      console.log('Starting device connection process...');
      await this.ensureBleManager();

      if (!this.bleManager) {
        console.error('BLE Manager is null before connection attempt');
        throw new Error('BLE Manager not initialized');
      }

      console.log('Checking device connection state...');
      const connectedDevices = await this.bleManager.connectedDevices([]);
      const isAlreadyConnected = connectedDevices.some(d => d.id === device.id);
      
      if (isAlreadyConnected) {
        console.log('Device is already connected, checking services...');
        this.device = device;
        try {
          const services = await device.services();
          console.log('Connected device services:', services.map(s => s.uuid));
        } catch (error) {
          console.error('Error getting services from connected device:', error);
        }
        return;
      }

      console.log('Attempting to connect to device:', {
        name: device.name,
        id: device.id,
        rssi: device.rssi
      });

      // Try to connect
      this.device = await device.connect({
        timeout: 10000, // 10 second timeout
      });
      
      console.log('Connected to device, discovering services...');
      const services = await this.device.discoverAllServicesAndCharacteristics();
      console.log('Discovered services:', services.map(s => s.uuid));
      
      // Subscribe to notifications
      console.log('Setting up notification subscription...');
      this.device.monitorCharacteristicForService(
        'FFE0', // Service UUID for ESP32 Serial
        'FFE1', // Characteristic UUID for ESP32 Serial
        (error, characteristic) => {
          if (error) {
            console.error('Notification error details:', {
              message: error.message,
              code: error.code,
              stack: error.stack
            });
            return;
          }

          if (characteristic?.value && this.onDataReceived) {
            const data = Buffer.from(characteristic.value, 'base64').toString();
            console.log('Received data from device:', data);
            this.onDataReceived(data);
          }
        },
      );
      console.log('Successfully subscribed to notifications');
    } catch (error) {
      console.error('Connection error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        device: {
          name: device.name,
          id: device.id
        }
      });
      throw error;
    }
  }

  // Disconnect from the device
  async disconnect(): Promise<void> {
    if (this.device) {
      console.log('Disconnecting from device:', this.device.name);
      try {
        await this.device.cancelConnection();
        console.log('Successfully disconnected');
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
      this.device = null;
    }
  }

  // Set callback for received data
  setOnDataReceived(callback: (data: string) => void): void {
    this.onDataReceived = callback;
  }

  // Check if connected
  isConnected(): boolean {
    return this.device !== null;
  }

  // Clean up
  destroy(): void {
    this.disconnect();
    if (this.bleManager) {
      this.bleManager.destroy();
      this.bleManager = null;
    }
  }
}

export default new BluetoothService(); 