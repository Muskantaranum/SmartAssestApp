import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { bluetoothService } from '../services/BluetoothService';

interface ShelfStatus {
  id: string;
  name: string;
  weight: number;
  presence: string;
  lastUpdate: Date;
  isLowStock: boolean;
}

export const AdminDashboardScreen: React.FC = () => {
  const [shelves, setShelves] = useState<ShelfStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LOW_STOCK_THRESHOLD = 350; // 350g threshold for low stock

  useEffect(() => {
    // Initialize with some sample shelves (replace with your actual shelf data)
    const initialShelves: ShelfStatus[] = [
      { id: '1', name: 'Shelf A', weight: 0, presence: 'Unknown', lastUpdate: new Date(), isLowStock: false },
      { id: '2', name: 'Shelf B', weight: 0, presence: 'Unknown', lastUpdate: new Date(), isLowStock: false },
      { id: '3', name: 'Shelf C', weight: 0, presence: 'Unknown', lastUpdate: new Date(), isLowStock: false },
    ];
    setShelves(initialShelves);

    // Set up data received callback
    bluetoothService.setOnDataReceived((data: string | Buffer | ArrayBuffer) => {
      try {
        const dataStr = typeof data === 'string' ? data : 
                       data instanceof Buffer ? data.toString('utf-8') :
                       new TextDecoder().decode(data as ArrayBuffer);
        
        // Parse the data (adjust these patterns based on your ESP32's data format)
        const weightMatch = dataStr.match(/Weight:\s*([\d.-]+)\s*g/i);
        const presenceMatch = dataStr.match(/Object:\s*(.*?)(?:,|$)/i);
        const shelfMatch = dataStr.match(/Shelf:\s*([A-Za-z0-9]+)/i);

        if (weightMatch && shelfMatch) {
          const weight = parseFloat(weightMatch[1]);
          const shelfId = shelfMatch[1];
          const presence = presenceMatch ? presenceMatch[1].trim() : 'Unknown';
          
          if (!isNaN(weight)) {
            setShelves(prevShelves => {
              return prevShelves.map(shelf => {
                if (shelf.id === shelfId) {
                  const isLowStock = weight < LOW_STOCK_THRESHOLD && presence.toLowerCase() !== 'present';
                  return {
                    ...shelf,
                    weight,
                    presence,
                    lastUpdate: new Date(),
                    isLowStock
                  };
                }
                return shelf;
              });
            });
          }
        }
      } catch (error) {
        console.error('Error parsing shelf data:', error);
      }
    });

    // Check connection status
    const checkConnection = async () => {
      try {
        const connected = await bluetoothService.getConnectionStatus();
        setIsConnected(connected);
      } catch (error) {
        console.error('Error checking connection:', error);
        setIsConnected(false);
      }
    };
    checkConnection();

    // Set up connection status monitoring
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (shelf: ShelfStatus) => {
    if (!isConnected) return '#FFA500'; // Orange for disconnected
    if (shelf.isLowStock) return '#FF3B30'; // Red for low stock
    if (shelf.weight >= LOW_STOCK_THRESHOLD) return '#4CAF50'; // Green for good stock
    return '#FFA500'; // Orange for other cases
  };

  const getStatusText = (shelf: ShelfStatus) => {
    if (!isConnected) return 'Disconnected';
    if (shelf.isLowStock) return 'Low Stock';
    if (shelf.weight >= LOW_STOCK_THRESHOLD) return 'In Stock';
    return 'Check Stock';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isConnected ? '#4CAF50' : '#FF3B30' }
          ]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View style={styles.shelvesContainer}>
        {shelves.map(shelf => (
          <View 
            key={shelf.id} 
            style={[
              styles.shelfCard,
              { borderLeftColor: getStatusColor(shelf) }
            ]}
          >
            <View style={styles.shelfHeader}>
              <Text style={styles.shelfName}>{shelf.name}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(shelf) + '20' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(shelf) }
                ]}>
                  {getStatusText(shelf)}
                </Text>
              </View>
            </View>

            <View style={styles.shelfDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Weight:</Text>
                <Text style={styles.detailValue}>
                  {shelf.weight.toFixed(2)} g
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Object Status:</Text>
                <Text style={styles.detailValue}>
                  {shelf.presence}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Update:</Text>
                <Text style={styles.detailValue}>
                  {shelf.lastUpdate.toLocaleTimeString()}
                </Text>
              </View>
            </View>

            {shelf.isLowStock && (
              <View style={styles.alertContainer}>
                <Text style={styles.alertText}>
                  ⚠️ Low Stock Alert: Weight below {LOW_STOCK_THRESHOLD}g and no object detected
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#FF3B30',
    padding: 10,
    textAlign: 'center',
    backgroundColor: '#FFE5E5',
    margin: 10,
    borderRadius: 8,
  },
  shelvesContainer: {
    padding: 16,
  },
  shelfCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shelfName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  shelfDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  alertContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  alertText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
  },
}); 