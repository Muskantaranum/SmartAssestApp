import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import ExpiryDateTrackingScreen from './ExpiryDateTrackingScreen';
import InventorySection from '../screens/InventorySection';

type Feature = {
  title: string;
  screen: keyof RootStackParamList;
  isHardware?: boolean;
};

const Dashboard = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const features: Feature[] = [
    { 
      title: '⚖️ Smart Scale Integration', 
      screen: 'Scale',
      isHardware: true 
    },
    { title: '📦 Manage Products', screen: 'ManageProducts' },
    { title: '📍 Product Location in Store', screen: 'ProductLocation' },
    { title: '📈 Data Analytics & Visualizations', screen: 'Analytics' },
    { title: '📦 Batch Management', screen: 'BatchManagement' },
    { title: '🗂️ Product Categories', screen: 'ProductCategories' },
    { title: '📅 Expiry Date Tracking', screen: 'ExpiryDateTracking' },
    { title: '🔧 IoT Device Manager', screen: 'IoTDeviceManager' },
  ];

  const renderHeader = () => (
    <View style={styles.innerContainer}>
      <Text style={styles.title}>📋 Dashboard</Text>
      <ExpiryDateTrackingScreen />
      <InventorySection />
    </View>
  );

  const renderFeature = ({ item, index }: { item: typeof features[0], index: number }) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.card,
        item.isHardware && styles.hardwareCard
      ]}
      onPress={() => navigation.navigate(item.screen)}
    >
      <Text style={[
        styles.cardText,
        item.isHardware && styles.hardwareCardText
      ]}>
        {item.title}
      </Text>
      {item.isHardware && (
        <Text style={styles.hardwareSubtext}>
          Connect to ESP32 Smart Scale
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={features}
        renderItem={renderFeature}
        keyExtractor={(_, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingBottom: 100,
  },
  innerContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  hardwareCard: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  cardText: {
    fontSize: 16,
  },
  hardwareCardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  hardwareSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default Dashboard;