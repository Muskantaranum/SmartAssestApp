import { BleManager, Device, State, Characteristic, ScanMode, ScanCallbackType } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

class BluetoothService {
  private bleManager: BleManager;
  private device: Device | null = null;
  private isConnected: boolean = false;
  private onDataReceived: ((data: string) => void) | null = null;

  constructor() {
    this.bleManager = new BleManager();
  }

  async getBluetoothState(): Promise<string> {
    return await this.bleManager.state();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // For Android 12 and above
        if (Platform.Version >= 31) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const allGranted = Object.values(granted).every(
            (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
          );

          if (!allGranted) {
            console.log('Bluetooth permissions not granted:', granted);
            Alert.alert(
              'Permissions Required',
              'Bluetooth and Location permissions are required for scanning and connecting to devices. Please grant these permissions in your device settings.',
              [
                { text: 'OK', onPress: () => console.log('OK Pressed') }
              ]
            );
            return false;
          }
        } else {
          // For Android 11 and below
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);

          const allGranted = Object.values(granted).every(
            (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
          );

          if (!allGranted) {
            console.log('Location permissions not granted:', granted);
            Alert.alert(
              'Location Permission Required',
              'Location permission is required for scanning Bluetooth devices. Please grant this permission in your device settings.',
              [
                { text: 'OK', onPress: () => console.log('OK Pressed') }
              ]
            );
            return false;
          }
        }

        // Check if Bluetooth is enabled
        const state = await this.getBluetoothState();
        if (state !== 'PoweredOn') {
          Alert.alert(
            'Bluetooth Required',
            'Please turn on Bluetooth to scan for devices.',
            [
              { text: 'OK', onPress: () => console.log('OK Pressed') }
            ]
          );
          return false;
        }

        return true;
      } catch (err) {
        console.error('Error requesting permissions:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  async scanForDevices(): Promise<Device[]> {
    try {
      const devices: Device[] = [];
      const targetMacAddress = '38:18:2B:8A:1B:1E'.toLowerCase();
      
      console.log('\n=== BLE SCAN DEBUG START ===');
      console.log('📱 [BLE] Current Bluetooth state:', await this.getBluetoothState());
      console.log('🎯 [BLE] Looking for ESP32 with MAC:', targetMacAddress);
      
      // Check if Bluetooth is available and powered on
      const state = await this.getBluetoothState();
      console.log('📱 [BLE] Bluetooth state:', state);
      
      if (state !== 'PoweredOn') {
        console.error('❌ [BLE] Bluetooth is not powered on. Current state:', state);
        throw new Error('Bluetooth is not powered on');
      }

      // Log platform-specific information
      console.log('\n📱 [BLE] Platform Information:');
      console.log('  OS:', Platform.OS);
      console.log('  Version:', Platform.Version);
      console.log('  Permissions:', await this.checkPermissions());

      // Start a very basic scan
      console.log('\n🔍 [BLE] Starting basic scan...');
      let scanStartTime = Date.now();
      let devicesFound = 0;
      
      await this.bleManager.startDeviceScan(
        null, // Scan for all services
        {
          allowDuplicates: true,
          scanMode: ScanMode.LowLatency,
        },
        (error, device) => {
          if (error) {
            console.error('❌ [BLE] Scan error:', error);
            return;
          }
          
          if (device) {
            devicesFound++;
            const deviceId = device.id.toLowerCase();
            const isTargetDevice = deviceId === targetMacAddress;
            
            // Log every device found
            console.log(`\n📱 [BLE] Device #${devicesFound}:`);
            console.log('  Time since scan start:', (Date.now() - scanStartTime) + 'ms');
            console.log('  Name:', device.name || 'Unknown');
            console.log('  Local Name:', device.localName || 'Unknown');
            console.log('  ID/MAC:', device.id);
            console.log('  RSSI:', device.rssi);
            console.log('  Connectable:', device.isConnectable);
            console.log('  Services:', device.serviceUUIDs?.join(', ') || 'None');
            console.log('  Manufacturer Data:', device.manufacturerData || 'None');
            
            if (isTargetDevice) {
              console.log('🎯 [BLE] TARGET ESP32 FOUND!');
              console.log('  Full device info:', JSON.stringify({
                name: device.name,
                localName: device.localName,
                id: device.id,
                rssi: device.rssi,
                isConnectable: device.isConnectable,
                serviceUUIDs: device.serviceUUIDs,
                manufacturerData: device.manufacturerData,
                txPowerLevel: device.txPowerLevel,
                mtu: device.mtu
              }, null, 2));
            }
            
            // Store device if we haven't seen it before
            if (!devices.some(d => d.id === device.id)) {
              devices.push(device);
            }
          }
        }
      );

      // Scan for 20 seconds
      console.log('\n⏳ [BLE] Scanning for 20 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 20000));
      this.bleManager.stopDeviceScan();
      
      console.log('\n=== SCAN SUMMARY ===');
      console.log('Scan duration:', (Date.now() - scanStartTime) + 'ms');
      console.log('Total devices found:', devicesFound);
      console.log('Unique devices found:', devices.length);
      
      const targetDevice = devices.find(d => d.id.toLowerCase() === targetMacAddress);
      if (targetDevice) {
        console.log('\n✅ [BLE] Target ESP32 found!');
        console.log('  Name:', targetDevice.name || 'Unknown');
        console.log('  Local Name:', targetDevice.localName || 'Unknown');
        console.log('  RSSI:', targetDevice.rssi);
        console.log('  Connectable:', targetDevice.isConnectable);
        console.log('  Services:', targetDevice.serviceUUIDs?.join(', ') || 'None');
      } else {
        console.log('\n⚠️ [BLE] Target ESP32 not found!');
        console.log('Available devices:');
        devices.forEach(d => {
          console.log(`  - ${d.name || d.localName || 'Unknown'} (${d.id}) [RSSI: ${d.rssi}]`);
        });
        
        console.log('\n⚠️ [BLE] Troubleshooting tips:');
        console.log('1. Make sure ESP32 is powered on');
        console.log('2. Check if ESP32 is in range (RSSI should be > -80)');
        console.log('3. Verify ESP32 is advertising (not connected to another device)');
        console.log('4. Try restarting the ESP32');
        console.log('5. Check if Bluetooth is working by scanning for other devices');
      }

      return devices;
    } catch (error) {
      console.error('❌ [BLE] Scan error:', error);
      throw error;
    }
  }

  private async checkPermissions(): Promise<string> {
    if (Platform.OS === 'android') {
      try {
        const permissions: Array<keyof typeof PermissionsAndroid.PERMISSIONS> = [];
        if (Platform.Version >= 31) {
          permissions.push(
            'BLUETOOTH_SCAN',
            'BLUETOOTH_CONNECT',
            'ACCESS_FINE_LOCATION'
          );
        } else {
          permissions.push(
            'ACCESS_FINE_LOCATION',
            'ACCESS_COARSE_LOCATION'
          );
        }
        
        const results = await Promise.all(
          permissions.map(permission => 
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS[permission])
              .then(granted => ({ permission, granted }))
              .catch(() => ({ permission, granted: false }))
          )
        );
        
        return JSON.stringify(
          results.reduce((acc, { permission, granted }) => {
            acc[permission] = granted;
            return acc;
          }, {} as Record<string, boolean>)
        );
      } catch (error) {
        return 'Error checking permissions: ' + error;
      }
    }
    return 'iOS permissions handled by system';
  }

  async connectToDevice(device: Device): Promise<boolean> {
    try {
      console.log('🔌 [BLE] Attempting to connect to device:', {
        name: device.name,
        id: device.id,
        rssi: device.rssi
      });

      this.device = await device.connect();
      console.log('✅ [BLE] Device connected successfully');
      
      console.log('🔍 [BLE] Discovering services and characteristics...');
      await this.device.discoverAllServicesAndCharacteristics();
      console.log('✅ [BLE] Services and characteristics discovered');
      
      this.isConnected = true;

      // Subscribe to notifications
      console.log('📡 [BLE] Setting up notification subscription...');
      const characteristic = await this.device.readCharacteristicForService(
        '91bad492-b950-4226-aa2b-4ede9fa42f59',
        'cba1d466-344c-4be3-ab3f-189f80dd7518'
      );
      console.log('📡 [BLE] Characteristic read:', characteristic?.uuid);

      if (characteristic) {
        this.device.monitorCharacteristicForService(
          '91bad492-b950-4226-aa2b-4ede9fa42f59',
          'cba1d466-344c-4be3-ab3f-189f80dd7518',
          (error, characteristic) => {
            if (error) {
              console.error('❌ [BLE] Notification error:', error);
              return;
            }
            if (characteristic?.value && this.onDataReceived) {
              try {
                console.log('📥 [BLE] Received data:', characteristic.value);
                this.onDataReceived(characteristic.value);
              } catch (err) {
                console.error('❌ [BLE] Error processing received data:', err);
              }
            }
          }
        );
        console.log('✅ [BLE] Notification subscription set up');
      }

      return true;
    } catch (error) {
      console.error('❌ [BLE] Connection error:', error);
      return false;
    }
  }

  setOnDataReceived(callback: (data: string) => void) {
    this.onDataReceived = callback;
  }

  async disconnect(): Promise<void> {
    if (this.device && this.isConnected) {
      await this.device.cancelConnection();
      this.isConnected = false;
      this.device = null;
    }
  }

  isDeviceConnected(): boolean {
    return this.isConnected;
  }

  public async getConnectionStatus(): Promise<boolean> {
    try {
      // Check if we have an active connection
      return this.device !== null && this.device.isConnected;
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }
}

export const bluetoothService = new BluetoothService(); 