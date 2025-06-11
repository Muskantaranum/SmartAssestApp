import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { bluetoothService } from '../services/BluetoothService';

interface ShelfStatus {
  id: string;
  name: string;
  weight: number;
  presence: string;
  lastUpdate: Date;
  isLowStock: boolean;
}

const LowStockSection = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [shelves, setShelves] = useState<ShelfStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const LOW_STOCK_THRESHOLD = 350; // 350g threshold

  useEffect(() => {
    // Initialize with specific shelves that match the scale data
    const initialShelves: ShelfStatus[] = [
      { id: 'Shelf2', name: 'Shelf 2', weight: 0, presence: 'Unknown', lastUpdate: new Date(), isLowStock: false },
      { id: 'Shelf1', name: 'Shelf 1', weight: 0, presence: 'Unknown', lastUpdate: new Date(), isLowStock: false },
      { id: 'Shelf3', name: 'Shelf 3', weight: 0, presence: 'Unknown', lastUpdate: new Date(), isLowStock: false },
    ];
    setShelves(initialShelves);

    // Set up data received callback
    bluetoothService.setOnDataReceived((data: string | Buffer | ArrayBuffer) => {
      try {
        const dataStr = typeof data === 'string' ? data : 
                       data instanceof Buffer ? data.toString('utf-8') :
                       new TextDecoder().decode(data as ArrayBuffer);
        
        console.log('Received scale data:', dataStr); // Debug log
        
        // Parse the data with more flexible patterns
        const weightMatch = dataStr.match(/Weight:\s*([\d.-]+)\s*g/i);
        const presenceMatch = dataStr.match(/Object:\s*(.*?)(?:,|$)/i);
        const shelfMatch = dataStr.match(/Shelf:\s*([A-Za-z0-9]+)/i);

        if (weightMatch && shelfMatch) {
          const weight = parseFloat(weightMatch[1]);
          const shelfId = shelfMatch[1].trim();
          const presence = presenceMatch ? presenceMatch[1].trim() : 'Unknown';
          
          console.log('Parsed data:', { shelfId, weight, presence }); // Debug log
          
          if (!isNaN(weight)) {
            setShelves(prevShelves => {
              return prevShelves.map(shelf => {
                // Match shelf by ID (case-insensitive)
                if (shelf.id.toLowerCase() === shelfId.toLowerCase()) {
                  const isLowStock = weight < LOW_STOCK_THRESHOLD || 
                                   presence.toLowerCase() === 'no object';
                  console.log(`Shelf ${shelf.name} status:`, { weight, presence, isLowStock }); // Debug log
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

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const lowStockShelves = shelves.filter(shelf => shelf.isLowStock);

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Low Stock Monitoring</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Scale')}
            style={[styles.connectButton, isConnected && styles.connectedButton]}
          >
            <Text style={styles.connectButtonText}>
              {isConnected ? 'Connected' : 'Connect Scale'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isConnected && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Please connect to the scale to monitor stock levels
            </Text>
          </View>
        )}

        {isConnected && lowStockShelves.length === 0 && (
          <View style={styles.noAlertContainer}>
            <Text style={styles.noAlertText}>No low stock alerts</Text>
            <Text style={styles.subText}>All shelves are well stocked</Text>
          </View>
        )}

        {isConnected && lowStockShelves.length > 0 && (
          <>
            <Text style={styles.alertTitle}>Low Stock Alerts</Text>
            {lowStockShelves.map(shelf => (
              <View key={shelf.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.shelfName}>{shelf.name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Low Stock</Text>
                  </View>
                </View>
                
                <View style={styles.alertDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Weight:</Text>
                    <Text style={[styles.detailValue, shelf.weight < LOW_STOCK_THRESHOLD && styles.lowStockValue]}>
                      {shelf.weight.toFixed(2)} g
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Object Status:</Text>
                    <Text style={[styles.detailValue, shelf.presence.toLowerCase() === 'no object' && styles.lowStockValue]}>
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

                <View style={styles.alertMessage}>
                  <Text style={styles.alertText}>
                    ⚠️ {shelf.weight < LOW_STOCK_THRESHOLD ? 
                      `Weight below ${LOW_STOCK_THRESHOLD}g` : 
                      'No object detected'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {isConnected && (
          <View style={styles.allShelvesContainer}>
            <Text style={styles.allShelvesTitle}>All Shelves Status</Text>
            {shelves.map(shelf => (
              <View key={shelf.id} style={[styles.shelfCard, shelf.isLowStock && styles.lowStockShelfCard]}>
                <Text style={styles.shelfName}>{shelf.name}</Text>
                <View style={styles.shelfDetails}>
                  <Text style={styles.shelfDetail}>Weight: {shelf.weight.toFixed(2)}g</Text>
                  <Text style={styles.shelfDetail}>Status: {shelf.presence}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  connectButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  connectedButton: {
    backgroundColor: '#4CAF50',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    color: '#F57C00',
    fontSize: 14,
    textAlign: 'center',
  },
  noAlertContainer: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  noAlertText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  subText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shelfName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  alertDetails: {
    borderTopWidth: 1,
    borderTopColor: '#FFE5E5',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  lowStockValue: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  alertMessage: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
  },
  alertText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  allShelvesContainer: {
    marginTop: 20,
  },
  allShelvesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  shelfCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lowStockShelfCard: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  shelfDetails: {
    marginTop: 8,
  },
  shelfDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default LowStockSection; 