import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ShockEvent {
  id: string;
  timestamp: Date;
  weight: number;
  isShockDetected: boolean;
  location: string;
}

const ShockDetection = () => {
  const [shockEvents, setShockEvents] = useState<ShockEvent[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  // Function to check for shock detection
  const checkForShock = (weight: number, previousWeight: number) => {
    const weightDifference = Math.abs(weight - previousWeight);
    const shockThreshold = 0.5; // Adjust this threshold based on your needs
    
    return weightDifference > shockThreshold;
  };

  // Function to handle weight data from ESP32
  const handleWeightData = async (weight: number, location: string) => {
    try {
      const previousEvent = shockEvents[0];
      const isShockDetected = previousEvent ? checkForShock(weight, previousEvent.weight) : false;

      if (isShockDetected) {
        // Log shock event to Firestore
        await addDoc(collection(db, 'shockEvents'), {
          timestamp: new Date(),
          weight,
          isShockDetected: true,
          location,
        });

        // Alert user about shock detection
        Alert.alert(
          '⚠️ Shock Detected!',
          `A shock was detected at location: ${location}\nWeight change: ${Math.abs(weight - (previousEvent?.weight || 0))}kg`
        );
      }

      // Update current weight
      setCurrentWeight(weight);

      // Update shock events list
      setShockEvents(prev => [{
        id: Date.now().toString(),
        timestamp: new Date(),
        weight,
        isShockDetected,
        location,
      }, ...prev].slice(0, 10)); // Keep only last 10 events

    } catch (error) {
      console.error('Error handling weight data:', error);
      Alert.alert('Error', 'Failed to process weight data');
    }
  };

  // Function to start monitoring
  const startMonitoring = () => {
    setIsMonitoring(true);
    // Here you would implement the WebSocket or MQTT connection to ESP32
    // Example WebSocket connection:
    /*
    const ws = new WebSocket('ws://your-esp32-ip:port');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWeightData(data.weight, data.location);
    };
    */
  };

  // Function to stop monitoring
  const stopMonitoring = () => {
    setIsMonitoring(false);
    // Close WebSocket connection
  };

  // Load recent shock events on component mount
  useEffect(() => {
    const loadRecentEvents = async () => {
      try {
        const q = query(
          collection(db, 'shockEvents'),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        })) as ShockEvent[];
        setShockEvents(events);
      } catch (error) {
        console.error('Error loading shock events:', error);
      }
    };

    loadRecentEvents();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shock Detection System</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isMonitoring ? 'Monitoring' : 'Stopped'}
        </Text>
        <Text style={styles.weightText}>
          Current Weight: {currentWeight.toFixed(2)} kg
        </Text>
      </View>

      <View style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        {shockEvents.map(event => (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventTime}>
              {event.timestamp.toLocaleString()}
            </Text>
            <Text style={styles.eventLocation}>
              Location: {event.location}
            </Text>
            <Text style={styles.eventWeight}>
              Weight: {event.weight.toFixed(2)} kg
            </Text>
            {event.isShockDetected && (
              <Text style={styles.shockAlert}>⚠️ Shock Detected</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 8,
  },
  weightText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e64e5',
  },
  eventsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 16,
    marginBottom: 4,
  },
  eventWeight: {
    fontSize: 16,
    color: '#2e64e5',
  },
  shockAlert: {
    color: '#dc2626',
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default ShockDetection; 