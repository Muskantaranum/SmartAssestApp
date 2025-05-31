import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue } from 'firebase/database';

const SensorDataScreen = () => {
  const [weight, setWeight] = useState<number | null>(null);
  const [objectPresence, setObjectPresence] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [weightHistory, setWeightHistory] = useState<number[]>([]);

  useEffect(() => {
    // Reference to the weight data in Firebase
    const weightRef = ref(database, 'weight');
    const presenceRef = ref(database, 'objectPresence');

    // Subscribe to real-time updates
    const weightUnsubscribe = onValue(weightRef, (snapshot) => {
      const data = snapshot.val();
      setWeight(data);
      setLastUpdate(new Date());
      setLoading(false);
      
      // Keep last 10 weight readings for history
      setWeightHistory(prev => {
        const newHistory = [...prev, data].slice(-10);
        return newHistory;
      });
    });

    const presenceUnsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      setObjectPresence(data);
    });

    // Cleanup subscriptions on unmount
    return () => {
      weightUnsubscribe();
      presenceUnsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e64e5" />
        <Text style={styles.loadingText}>Connecting to sensors...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Real-Time Sensor Data</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weight Sensor</Text>
        <Text style={styles.value}>
          {weight !== null ? `${weight.toFixed(2)} g` : 'No data'}
        </Text>
        {lastUpdate && (
          <Text style={styles.updateTime}>
            Last update: {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Object Presence</Text>
        <Text style={[
          styles.value,
          { color: objectPresence === 1 ? '#4CAF50' : '#F44336' }
        ]}>
          {objectPresence === 1 ? 'Object Detected' : 'No Object'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Weight History</Text>
        <View style={styles.historyContainer}>
          {weightHistory.map((w, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyTime}>
                {new Date(Date.now() - (weightHistory.length - 1 - index) * 1000).toLocaleTimeString()}
              </Text>
              <Text style={styles.historyValue}>{w.toFixed(2)} g</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <Text style={styles.statusText}>
          {weight !== null && objectPresence !== null 
            ? '✅ Sensors connected and transmitting'
            : '⚠️ Waiting for sensor data...'}
        </Text>
      </View>
    </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    color: '#2e64e5',
    fontWeight: 'bold',
  },
  updateTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  historyContainer: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTime: {
    fontSize: 14,
    color: '#666',
  },
  historyValue: {
    fontSize: 14,
    color: '#2e64e5',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

export default SensorDataScreen; 