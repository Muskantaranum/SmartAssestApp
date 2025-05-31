import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack'; // This import might not be needed anymore depending on other screens
import IoTService from '../services/IoTService';
import { Device, DeviceStatus } from '../types/IoT';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  CustomerDashboard: undefined;
  ManageProducts: undefined;
  ProductLocation: undefined;
  ExpiryDateTracking: undefined;
  CRBrowseProduct: undefined;
  CRShoppingList: undefined;
  CRExpiryDate: undefined;
  ProductCategories: undefined;
  Analytics: undefined;
  IoTDeviceManager: undefined;
  // SensorData: undefined; // Removed
};

// type NavigationProp = StackNavigationProp<RootStackParamList>; // Removed

const IoTDeviceManager = () => {
  const navigation = useNavigation(); // Removed type annotation
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<Device>>({
    name: '',
    type: 'combined',
    ipAddress: '',
    port: 81,
    location: '',
    status: 'disconnected',
  });

  const iotService = IoTService.getInstance();

  useEffect(() => {
    loadDevices();
    setupEventListeners();
    return () => {
      // Cleanup event listeners
      iotService.disconnectAllDevices();
    };
  }, []);

  const setupEventListeners = () => {
    iotService.addEventListener('statusChange', (deviceId: string, status: string) => 
      handleDeviceStatusChange(deviceId, status as DeviceStatus)
    );
    iotService.addEventListener('shockDetection', handleShockDetection);
    iotService.addEventListener('weightUpdate', handleWeightUpdate);
  };

  const loadDevices = async () => {
    try {
      const devicesRef = collection(db, 'iotDevices');
      const querySnapshot = await getDocs(devicesRef);
      const loadedDevices: Device[] = [];
      
      querySnapshot.forEach(doc => {
        const device = { id: doc.id, ...doc.data() } as Device;
        loadedDevices.push(device);
        iotService.registerDevice(device);
      });

      setDevices(loadedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load IoT devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceStatusChange = (deviceId: string, status: DeviceStatus) => {
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId ? { ...device, status } : device
      )
    );
  };

  const handleShockDetection = (deviceId: string, data: any) => {
    // Update device state with shock data
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId
          ? {
              ...device,
              lastShock: {
                timestamp: new Date(),
                weight: data.weight,
                location: data.location,
              },
            }
          : device
      )
    );

    // Show alert for shock detection
    Alert.alert(
      '⚠️ Shock Detected',
      `Device: ${devices.find(d => d.id === deviceId)?.name}\nLocation: ${data.location}\nWeight: ${data.weight}kg`
    );
  };

  const handleWeightUpdate = (deviceId: string, weight: number) => {
    setDevices(prevDevices =>
      prevDevices.map(device =>
        device.id === deviceId
          ? { ...device, currentWeight: weight, lastUpdate: new Date() }
          : device
      )
    );
  };

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.ipAddress || !newDevice.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const deviceRef = await addDoc(collection(db, 'iotDevices'), {
        ...newDevice,
        createdAt: new Date(),
      });

      const device: Device = {
        id: deviceRef.id,
        name: newDevice.name!,
        type: newDevice.type!,
        ipAddress: newDevice.ipAddress!,
        port: newDevice.port!,
        location: newDevice.location!,
        status: 'disconnected',
      };

      iotService.registerDevice(device);
      setDevices(prev => [...prev, device]);
      setShowAddDevice(false);
      setNewDevice({
        name: '',
        type: 'combined',
        ipAddress: '',
        port: 81,
        location: '',
        status: 'disconnected',
      });

      // Attempt to connect to the device
      connectToDevice(device);
    } catch (error) {
      console.error('Error adding device:', error);
      Alert.alert('Error', 'Failed to add device');
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      const connected = await iotService.connectToDevice(device.id, device.ipAddress, device.port);
      if (connected) {
        Alert.alert('Success', `Connected to device: ${device.name}`);
      } else {
        Alert.alert('Error', `Failed to connect to device: ${device.name}`);
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Error', `Connection failed: ${device.name}`);
    }
  };

  const disconnectDevice = (device: Device) => {
    iotService.disconnectDevice(device.id);
  };

  const deleteDevice = async (device: Device) => {
    try {
      await deleteDoc(doc(db, 'iotDevices', device.id));
      iotService.unregisterDevice(device.id);
      setDevices(prev => prev.filter(d => d.id !== device.id));
    } catch (error) {
      console.error('Error deleting device:', error);
      Alert.alert('Error', 'Failed to delete device');
    }
  };

  const renderDeviceCard = (device: Device) => (
    <View key={device.id} style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>{device.name}</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(device.status) }]} />
      </View>

      <Text style={styles.deviceInfo}>Type: {device.type}</Text>
      <Text style={styles.deviceInfo}>Location: {device.location}</Text>
      <Text style={styles.deviceInfo}>IP: {device.ipAddress}:{device.port}</Text>
      
      {device.currentWeight !== undefined && (
        <Text style={styles.deviceInfo}>
          Current Weight: {device.currentWeight.toFixed(2)} kg
        </Text>
      )}

      {device.lastShock && (
        <View style={styles.shockInfo}>
          <Text style={styles.shockText}>Last Shock:</Text>
          <Text style={styles.shockDetails}>
            {device.lastShock.timestamp.toLocaleString()}
          </Text>
          <Text style={styles.shockDetails}>
            Weight: {device.lastShock.weight.toFixed(2)} kg
          </Text>
        </View>
      )}

      <View style={styles.deviceActions}>
        {device.status === 'disconnected' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.connectButton]}
            onPress={() => connectToDevice(device)}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={() => disconnectDevice(device)}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            Alert.alert(
              'Delete Device',
              `Are you sure you want to delete ${device.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => deleteDevice(device), style: 'destructive' },
              ]
            );
          }}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#9E9E9E';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IoT Device Manager</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddDevice(true)}
        >
          <Text style={styles.addButtonText}>Add Device</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.deviceList}>
        {devices.map(renderDeviceCard)}
      </ScrollView>

      {showAddDevice && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Device</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Device Name"
              value={newDevice.name}
              onChangeText={text => setNewDevice(prev => ({ ...prev, name: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="IP Address"
              value={newDevice.ipAddress}
              onChangeText={text => setNewDevice(prev => ({ ...prev, ipAddress: text }))}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Port (default: 81)"
              value={newDevice.port?.toString()}
              onChangeText={text => setNewDevice(prev => ({ ...prev, port: parseInt(text) || 81 }))}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={newDevice.location}
              onChangeText={text => setNewDevice(prev => ({ ...prev, location: text }))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddDevice(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddDevice}
              >
                <Text style={styles.buttonText}>Add Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deviceList: {
    flex: 1,
    padding: 16,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deviceInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  shockInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3F3',
    borderRadius: 4,
  },
  shockText: {
    color: '#DC2626',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shockDetails: {
    fontSize: 12,
    color: '#666',
  },
  deviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  // Removed viewDataButton style
  // viewDataButton: {
  //   backgroundColor: '#2e64e5',
  //   marginHorizontal: 4,
  // },
});

export default IoTDeviceManager; 