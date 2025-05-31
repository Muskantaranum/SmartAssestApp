import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import BluetoothService from '../services/BluetoothService';
import { Device } from 'react-native-ble-plx';

interface SensorData {
  weight: number;
  objectDetected: boolean;
  rawData: string;
}

interface FoundDevice {
  name: string | null;
  id: string;
  rssi: number;
}

const ScaleScreen: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [foundDevices, setFoundDevices] = useState<FoundDevice[]>([]);
  const [sensorData, setSensorData] = useState<SensorData>({
    weight: 0,
    objectDetected: false,
    rawData: '',
  });

  useEffect(() => {
    // Set up data received callback
    BluetoothService.setOnDataReceived((data: string) => {
      try {
        console.log('Received data:', data);
        setSensorData(prev => ({ ...prev, rawData: data }));

        const weightMatch = data.match(/Weight: ([\d.]+) g/);
        const objectMatch = data.match(/Object: (Object Detected|No Object)/);

        if (weightMatch && objectMatch) {
          const weight = parseFloat(weightMatch[1]);
          const objectDetected = objectMatch[1] === 'Object Detected';

          setSensorData(prev => ({
            ...prev,
            weight,
            objectDetected,
          }));
        }
      } catch (error) {
        console.error('Error parsing sensor data:', error);
      }
    });

    // Cleanup on unmount
    return () => {
      BluetoothService.disconnect();
      BluetoothService.destroy();
    };
  }, []);

  const startScan = async () => {
    try {
      console.log('Starting scan...');
      setConnectionStatus('Starting scan...');
      setIsScanning(true);
      setFoundDevices([]); // Clear previous devices
      
      await BluetoothService.startScan(async (device: Device) => {
        console.log('Device found in scan:', device.name);
        
        // Add device to found devices list
        setFoundDevices(prev => {
          const exists = prev.some(d => d.id === device.id);
          if (!exists) {
            return [...prev, {
              name: device.name,
              id: device.id,
              rssi: device.rssi || 0,
            }];
          }
          return prev;
        });

        setConnectionStatus(`Found device: ${device.name}`);
        
        BluetoothService.stopScan();
        setIsScanning(false);
        
        try {
          setConnectionStatus('Connecting to device...');
          console.log('Attempting to connect to device...');
          
          await BluetoothService.connectToDevice(device);
          console.log('Successfully connected to device');
          setConnectionStatus('Connected successfully');
          setIsConnected(true);
        } catch (error) {
          console.error('Connection error details:', error);
          setConnectionStatus('Connection failed');
          Alert.alert(
            'Connection Error',
            `Failed to connect to the scale: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });

      // Add timeout for scanning
      setTimeout(() => {
        if (isScanning) {
          console.log('Scan timeout reached');
          setConnectionStatus('Scan timed out - no device found');
          BluetoothService.stopScan();
          setIsScanning(false);
          
          if (foundDevices.length === 0) {
            Alert.alert(
              'Connection Timeout',
              'Could not find any Bluetooth devices. Please make sure:\n\n' +
              '1. The ESP32 is powered on\n' +
              '2. Bluetooth is enabled on your phone\n' +
              '3. The ESP32 is in range\n' +
              '4. The device name contains "ESP32_Scale_BT"'
            );
          } else {
            Alert.alert(
              'Connection Timeout',
              'Found devices but none matched the scale. Available devices:\n\n' +
              foundDevices.map(d => `- ${d.name || 'Unknown'} (${d.id})`).join('\n')
            );
          }
        }
      }, 10000);

    } catch (error) {
      console.error('Scan error details:', error);
      setConnectionStatus('Scan failed');
      setIsScanning(false);
      Alert.alert(
        'Error',
        `Failed to start scanning: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        'Please check if Bluetooth is enabled on your device.'
      );
    }
  };

  const disconnect = async () => {
    try {
      setConnectionStatus('Disconnecting...');
      await BluetoothService.disconnect();
      setConnectionStatus('Disconnected');
      setIsConnected(false);
      setFoundDevices([]);
    } catch (error) {
      console.error('Disconnect error:', error);
      setConnectionStatus('Disconnect failed');
      Alert.alert('Error', 'Failed to disconnect from device');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        {isScanning && <ActivityIndicator style={styles.loader} />}
      </View>

      {connectionStatus && (
        <View style={styles.statusMessageContainer}>
          <Text style={styles.statusMessage}>{connectionStatus}</Text>
        </View>
      )}

      {!isConnected && !isScanning && (
        <TouchableOpacity 
          style={styles.button} 
          onPress={startScan}
          disabled={isScanning}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Scanning...' : 'Connect to Scale'}
          </Text>
        </TouchableOpacity>
      )}

      {isScanning && foundDevices.length > 0 && (
        <View style={styles.devicesContainer}>
          <Text style={styles.devicesTitle}>Found Devices:</Text>
          {foundDevices.map((device, index) => (
            <View key={device.id} style={styles.deviceItem}>
              <Text style={styles.deviceName}>
                {device.name || 'Unknown Device'} ({device.id})
              </Text>
              <Text style={styles.deviceRssi}>Signal: {device.rssi} dBm</Text>
            </View>
          ))}
        </View>
      )}

      {isConnected && (
        <>
          {/* Raw Data Display */}
          <View style={styles.rawDataContainer}>
            <Text style={styles.rawDataLabel}>Serial Monitor Data:</Text>
            <View style={styles.rawDataBox}>
              <Text style={styles.rawDataText}>{sensorData.rawData || 'Waiting for data...'}</Text>
            </View>
          </View>

          {/* Parsed Data Display */}
          <View style={styles.dataContainer}>
            <Text style={styles.dataLabel}>Weight:</Text>
            <Text style={styles.dataValue}>{sensorData.weight.toFixed(2)} g</Text>
          </View>

          <View style={styles.dataContainer}>
            <Text style={styles.dataLabel}>Object Status:</Text>
            <Text style={[
              styles.dataValue,
              { color: sensorData.objectDetected ? '#4CAF50' : '#F44336' }
            ]}>
              {sensorData.objectDetected ? 'Object Detected' : 'No Object'}
            </Text>
          </View>

          <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 20,
  },
  statusMessageContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devicesContainer: {
    padding: 20,
    marginBottom: 10,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  deviceItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  deviceRssi: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rawDataContainer: {
    padding: 20,
    marginBottom: 10,
  },
  rawDataLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  rawDataBox: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rawDataText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
  },
  dataContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  dataLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

export default ScaleScreen; 