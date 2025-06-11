import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { bluetoothService } from '../services/BluetoothService';

interface WeightReading {
  weight: number;
  timestamp: Date;
}

interface SensorData {
  weight: number;
  presence: string;
  lastUpdate: Date;
  isLowStock: boolean;
}

interface FoundDevice {
  name: string | null;
  localName: string | null;
  id: string;
  rssi: number;
  isConnectable: boolean;
  serviceUUIDs: string[] | null;
  isTargetDevice: boolean;
}

export const ScaleScreen: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [bluetoothState, setBluetoothState] = useState<string>('');
  const [foundDevices, setFoundDevices] = useState<FoundDevice[]>([]);
  const targetMacAddress = '38:18:2B:8A:1B:1E'.toLowerCase();
  const targetDeviceName = 'ESP32_Scale_BLE';
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [hourlyReadings, setHourlyReadings] = useState<WeightReading[]>([]);
  const [lastHourlyReading, setLastHourlyReading] = useState<Date | null>(null);
  const LOW_STOCK_THRESHOLD = 350; // 350g threshold for low stock

  useEffect(() => {
    console.log('🔄 [UI] ScaleScreen mounted');
    
    // Check Bluetooth state on mount
    const checkBluetoothState = async () => {
      try {
        const state = await bluetoothService.getBluetoothState();
        console.log('📱 [UI] Initial Bluetooth state:', state);
        setBluetoothState(state);
      } catch (error) {
        console.error('❌ [UI] Error checking Bluetooth state:', error);
      }
    };
    checkBluetoothState();

    // Set up data received callback
    bluetoothService.setOnDataReceived((data: string | Buffer | ArrayBuffer) => {
      try {
        // Log raw data in multiple formats to see exactly what we're receiving
        console.log('📥 [UI] ====== RAW DATA DEBUG ======');
        console.log('📥 [UI] Data type:', typeof data);
        
        // Convert to string in different ways to see the raw bytes
        let dataStr = '';
        if (typeof data === 'string') {
          dataStr = data;
          console.log('📥 [UI] Data as string:', data);
          console.log('📥 [UI] String length:', data.length);
          console.log('📥 [UI] String bytes:', Array.from(data).map(c => c.charCodeAt(0)));
        } else if (data instanceof Buffer) {
          dataStr = data.toString('utf-8');
          console.log('📥 [UI] Data as Buffer:', data);
          console.log('📥 [UI] Buffer length:', data.length);
          console.log('📥 [UI] Buffer bytes:', Array.from(data));
          console.log('📥 [UI] Buffer as hex:', data.toString('hex'));
        } else if (data instanceof ArrayBuffer) {
          const view = new Uint8Array(data);
          dataStr = new TextDecoder().decode(view);
          console.log('📥 [UI] Data as ArrayBuffer:', view);
          console.log('📥 [UI] ArrayBuffer length:', view.length);
          console.log('📥 [UI] ArrayBuffer bytes:', Array.from(view));
          console.log('📥 [UI] ArrayBuffer as hex:', Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(''));
        }
        
        console.log('📥 [UI] Final string value:', dataStr);
        console.log('📥 [UI] String bytes:', Array.from(dataStr).map(c => c.charCodeAt(0)));
        console.log('📥 [UI] ====== END RAW DATA ======');

        // Try to parse the data string from ESP32
        // First, clean the string by removing any non-printable characters
        const cleanStr = dataStr.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        console.log('📥 [UI] Cleaned string:', cleanStr);

        // Try different parsing patterns for weight
        const patterns = [
          /Weight:\s*([\d.-]+)\s*g/i,  // Weight: 123.45 g
          /Weight=([\d.-]+)\s*g/i,     // Weight=123.45 g
          /Weight:\s*([\d.-]+)/i,      // Weight: 123.45
          /([\d.-]+)\s*g/i,            // 123.45 g
          /W:([\d.-]+)/i,              // W:123.45
          /w:([\d.-]+)/i,              // w:123.45
          /([\d.-]+)/i,                // Just a number
        ];

        let weight = null;
        let presence = null;

        // Try each pattern for weight
        for (const pattern of patterns) {
          const match = cleanStr.match(pattern);
          if (match) {
            const rawValue = match[1];
            console.log('📊 [UI] Found potential weight value:', rawValue, 'using pattern:', pattern);
            const parsedWeight = parseFloat(rawValue);
            if (!isNaN(parsedWeight)) {
              // Only update if weight has changed or it's the first reading
              if (weight === null || Math.abs(parsedWeight - weight) > 0.01) {
                weight = parsedWeight;
                console.log('📊 [UI] New weight reading:', weight);
                setUpdateCount(prev => prev + 1);
                setLastUpdateTime(new Date());
                setIsMonitoring(true);
              }
              break;
            } else {
              console.log('❌ [UI] Failed to parse weight value:', rawValue);
            }
          }
        }

        // Log the entire string for presence debugging
        console.log('🔍 [UI] Looking for presence in string:', cleanStr);

        // Try to find presence/object status with more patterns
        const presencePatterns = [
          /Object:\s*(.*?)(?:,|$)/i,    // Object: present
          /Status:\s*(.*?)(?:,|$)/i,    // Status: present
          /Presence:\s*(.*?)(?:,|$)/i,  // Presence: present
          /Obj:\s*(.*?)(?:,|$)/i,       // Obj: present
          /S:\s*(.*?)(?:,|$)/i,         // S: present
          /P:\s*(.*?)(?:,|$)/i,         // P: present
          /Object=([^,\n]+)/i,          // Object=present
          /Status=([^,\n]+)/i,          // Status=present
          /Presence=([^,\n]+)/i,        // Presence=present
          /Obj=([^,\n]+)/i,             // Obj=present
          /S=([^,\n]+)/i,               // S=present
          /P=([^,\n]+)/i,               // P=present
          /Object([^,\n]+)/i,           // Objectpresent
          /Status([^,\n]+)/i,           // Statuspresent
          /Presence([^,\n]+)/i,         // Presencepresent
        ];

        // Log each line separately for presence debugging
        const lines = cleanStr.split('\n').filter(line => line.trim());
        console.log('📝 [UI] Data lines for presence:', lines);

        // Try each line for presence
        for (const line of lines) {
          console.log('🔍 [UI] Checking line for presence:', line);
          for (const pattern of presencePatterns) {
            const match = line.match(pattern);
            if (match) {
              presence = match[1].trim();
              console.log('📊 [UI] Found presence using pattern:', pattern, 'Value:', presence);
              break;
            }
          }
          if (presence) break;
        }

        // If we found a weight but no presence, try to infer presence from weight
        if (weight !== null && !presence) {
          // If weight is very close to 0, assume no object
          if (Math.abs(weight) < 0.1) {
            presence = 'No Object';
            console.log('📊 [UI] Inferred presence from weight:', presence);
          } else {
            presence = 'Object Present';
            console.log('📊 [UI] Inferred presence from weight:', presence);
          }
        }

        if (weight !== null) {
          const now = new Date();
          // Check for low stock condition
          const isLowStock = weight < LOW_STOCK_THRESHOLD && 
                            presence?.toLowerCase() !== 'present';
          
          console.log('📊 [UI] Final parsed data:', { 
            weight, 
            presence, 
            isLowStock,
            timestamp: now.toISOString() 
          });

          setSensorData({
            weight,
            presence: presence || 'Unknown',
            lastUpdate: now,
            isLowStock
          });
          setError(null);
        } else {
          console.error('❌ [UI] Could not parse weight from data. Raw data:', cleanStr);
          console.error('❌ [UI] Tried patterns:', patterns);
          setError('Could not parse weight data. Raw data: ' + cleanStr.substring(0, 50) + '...');
        }
      } catch (error: unknown) {
        console.error('❌ [UI] Error parsing sensor data:', error);
        if (error instanceof Error) {
          console.error('❌ [UI] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          setError('Error processing data: ' + error.message);
        } else {
          console.error('❌ [UI] Unknown error type:', error);
          setError('Error processing data: Unknown error');
        }
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🔄 [UI] ScaleScreen unmounting, disconnecting...');
      bluetoothService.disconnect();
    };
  }, []);

  // Add monitoring status check
  useEffect(() => {
    let monitoringInterval: NodeJS.Timeout;
    
    if (isConnected) {
      // Check for data updates every second
      monitoringInterval = setInterval(() => {
        const now = new Date();
        if (lastUpdateTime) {
          const timeSinceLastUpdate = now.getTime() - lastUpdateTime.getTime();
          // If no updates for more than 2 seconds, consider monitoring stopped
          if (timeSinceLastUpdate > 2000) {
            setIsMonitoring(false);
          }
        }
      }, 1000);
    }

    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [isConnected, lastUpdateTime]);

  // Add hourly reading check
  useEffect(() => {
    let hourlyInterval: NodeJS.Timeout;
    
    if (isConnected) {
      // Check for hourly readings
      hourlyInterval = setInterval(() => {
        const now = new Date();
        if (sensorData && sensorData.weight !== null) {
          // Only take reading if it's been at least an hour since last reading
          if (!lastHourlyReading || 
              (now.getTime() - lastHourlyReading.getTime()) >= 3600000) { // 3600000 ms = 1 hour
            const newReading: WeightReading = {
              weight: sensorData.weight,
              timestamp: now
            };
            setHourlyReadings(prev => [...prev, newReading].slice(-24)); // Keep last 24 readings
            setLastHourlyReading(now);
            console.log('📊 [UI] New hourly reading:', newReading);
          }
        }
      }, 60000); // Check every minute
    }

    return () => {
      if (hourlyInterval) {
        clearInterval(hourlyInterval);
      }
    };
  }, [isConnected, sensorData, lastHourlyReading]);

  const handleScanAndConnect = async () => {
    try {
      console.log('🔍 [UI] Starting scan and connect process');
      setIsScanning(true);
      setError(null);
      setFoundDevices([]);
      setScanStatus('Checking Bluetooth state...');
      
      // Request permissions
      console.log('🔑 [UI] Requesting permissions...');
      const hasPermissions = await bluetoothService.requestPermissions();
      if (!hasPermissions) {
        console.error('❌ [UI] Permissions not granted');
        setError('Bluetooth permissions are required. Please grant permissions in your device settings.');
        setScanStatus('');
        return;
      }
      console.log('✅ [UI] Permissions granted');

      setScanStatus('Scanning for devices (this will take 15 seconds)...');
      console.log('🔍 [UI] Starting device scan...');
      
      // Scan for devices
      const devices = await bluetoothService.scanForDevices();
      console.log('📱 [UI] Found devices:', devices.length);
      
      // Convert devices to our interface and log each device
      const deviceList = devices.map(d => {
        const isTarget = Boolean(
          d.id.toLowerCase() === targetMacAddress || 
          (d.name?.includes(targetDeviceName) || d.localName?.includes(targetDeviceName))
        );
        const device = {
          name: d.name,
          localName: d.localName,
          id: d.id,
          rssi: d.rssi || 0,
          isConnectable: d.isConnectable || false,
          serviceUUIDs: d.serviceUUIDs,
          isTargetDevice: isTarget
        };
        console.log('📱 [UI] Device found:', {
          name: device.name,
          localName: device.localName,
          id: device.id,
          isTarget: device.isTargetDevice
        });
        return device;
      });
      setFoundDevices(deviceList);

      if (devices.length === 0) {
        console.error('❌ [UI] No devices found');
        setError(
          'No Bluetooth devices found.\n\n' +
          'Please check:\n' +
          '1. Bluetooth is enabled on your phone\n' +
          '2. Your device is in range\n' +
          '3. The ESP32 is powered on\n' +
          '4. Your device is not in airplane mode'
        );
        setScanStatus('');
        return;
      }

      // Find target ESP32 device - now checking both MAC and name
      const targetDevice = devices.find(d => 
        d.id.toLowerCase() === targetMacAddress || 
        d.name?.includes(targetDeviceName) || 
        d.localName?.includes(targetDeviceName)
      );

      if (!targetDevice) {
        console.error('❌ [UI] Target ESP32 not found');
        setError(
          'ESP32 Scale not found.\n\n' +
          'Looking for:\n' +
          `- Device name containing: ${targetDeviceName}\n` +
          `- MAC address: ${targetMacAddress}\n\n` +
          'Found devices:\n' +
          deviceList.map(d => 
            `- ${d.name || d.localName || 'Unknown'} (${d.id}) [RSSI: ${d.rssi}]`
          ).join('\n')
        );
        setScanStatus('');
        return;
      }

      console.log('🎯 [UI] Found target device:', {
        name: targetDevice.name,
        localName: targetDevice.localName,
        id: targetDevice.id,
        isConnectable: targetDevice.isConnectable
      });

      setScanStatus('Connecting to ESP32...');
      // Connect to the target device
      console.log('🔌 [UI] Attempting connection to device:', targetDevice.id);
      const connected = await bluetoothService.connectToDevice(targetDevice);
      console.log('🔌 [UI] Connection result:', connected);
      setIsConnected(connected);
      setScanStatus('');

      if (!connected) {
        console.error('❌ [UI] Failed to connect to ESP32');
        setError(
          'Failed to connect to the ESP32.\n\n' +
          'Please check:\n' +
          '1. The device is still in range\n' +
          '2. The device is not connected to another phone\n' +
          '3. Try turning the ESP32 off and on again\n' +
          '4. Try restarting the app'
        );
      }
    } catch (error: any) {
      console.error('❌ [UI] Connection error:', error);
      setError(
        error.message === 'Bluetooth is not powered on'
          ? 'Please turn on Bluetooth in your device settings'
          : `Connection error: ${error.message || 'Unknown error'}\n\nPlease try again.`
      );
      setScanStatus('');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDisconnect = async () => {
    console.log('🔌 [UI] Disconnecting from device...');
    await bluetoothService.disconnect();
    setIsConnected(false);
    setSensorData(null);
    console.log('✅ [UI] Disconnected successfully');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollViewContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Smart Scale</Text>
        
        {bluetoothState !== 'PoweredOn' && (
          <Text style={styles.warningText}>
            Bluetooth is {bluetoothState.toLowerCase()}. Please turn on Bluetooth.
          </Text>
        )}
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        {scanStatus && (
          <Text style={styles.statusText}>{scanStatus}</Text>
        )}

        {foundDevices.length > 0 && !isConnected && (
          <View style={styles.devicesContainer}>
            <Text style={styles.devicesTitle}>Found Devices:</Text>
            {foundDevices.map((device) => (
              <View 
                key={device.id} 
                style={[
                  styles.deviceItem,
                  device.isTargetDevice && styles.targetDeviceItem
                ]}
              >
                <View style={styles.deviceHeader}>
                  <Text style={[
                    styles.deviceName,
                    device.isTargetDevice && styles.targetDeviceName
                  ]}>
                    {device.name || device.localName || 'Unknown Device'}
                    {device.isTargetDevice && ' (ESP32 Scale)'}
                  </Text>
                  {device.isTargetDevice && (
                    <View style={styles.targetBadge}>
                      <Text style={styles.targetBadgeText}>Target</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.deviceInfo}>
                  MAC: {device.id}
                </Text>
                <Text style={styles.deviceInfo}>
                  RSSI: {device.rssi} dBm
                </Text>
                {device.serviceUUIDs && device.serviceUUIDs.length > 0 && (
                  <Text style={styles.deviceInfo}>
                    Services: {device.serviceUUIDs.length}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        
        {!isConnected ? (
          <TouchableOpacity
            style={[styles.button, bluetoothState !== 'PoweredOn' && styles.buttonDisabled]}
            onPress={handleScanAndConnect}
            disabled={isScanning || bluetoothState !== 'PoweredOn'}
          >
            {isScanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.buttonText, styles.scanningText]}>Scanning...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                {bluetoothState !== 'PoweredOn' ? 'Turn on Bluetooth' : 'Scan for Devices'}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={[
              styles.dataContainer,
              sensorData?.isLowStock && styles.lowStockContainer
            ]}>
              <View style={styles.dataHeader}>
                <Text style={styles.dataLabel}>Current Weight:</Text>
                {isMonitoring && (
                  <View style={styles.monitoringIndicator}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.monitoringText}>Monitoring</Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.dataValue,
                sensorData?.isLowStock && styles.lowStockValue
              ]}>
                {sensorData?.weight ? `${sensorData.weight.toFixed(2)} g` : '--'}
              </Text>
              
              <Text style={styles.dataLabel}>Object Status:</Text>
              <Text style={[
                styles.dataValue,
                sensorData?.isLowStock && styles.lowStockValue
              ]}>
                {sensorData?.presence || '--'}
              </Text>

              {sensorData?.isLowStock && (
                <View style={styles.alertContainer}>
                  <Text style={styles.alertText}>
                    ⚠️ Low Stock Alert: Weight below {LOW_STOCK_THRESHOLD}g and no object detected
                  </Text>
                </View>
              )}

              {lastUpdateTime && (
                <Text style={styles.updateInfo}>
                  Last update: {lastUpdateTime.toLocaleTimeString()}
                  {'\n'}
                  Updates received: {updateCount}
                </Text>
              )}
            </View>

            {hourlyReadings.length > 0 && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Hourly Readings</Text>
                {hourlyReadings.map((reading, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyTime}>
                      {formatDate(reading.timestamp)}
                    </Text>
                    <Text style={styles.historyWeight}>
                      {reading.weight.toFixed(2)} g
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dataContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    marginLeft: 8,
  },
  warningText: {
    color: '#FF9500',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  devicesContainer: {
    width: '100%',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 300,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  deviceInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  targetDeviceItem: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  targetDeviceName: {
    color: '#1976D2',
    fontWeight: '700',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  targetBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  targetBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  monitoringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  monitoringText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  updateInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  historyContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTime: {
    fontSize: 14,
    color: '#666',
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lowStockContainer: {
    borderColor: '#FF3B30',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  lowStockValue: {
    color: '#FF3B30',
  },
  alertContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  alertText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 