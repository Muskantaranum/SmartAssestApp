// screens/CustomerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ScrollView } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CRExpiryDate from './CRExpiryDate';

type RootStackParamList = {
  CRBrowseProduct: undefined;
  ProductLocation: undefined;
  CRShoppingList: undefined;
  CRExpiryDate: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Product {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  expiryDate?: any;
}

const CustomerDashboard = () => {
  const navigation = useNavigation<NavigationProp>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: '🔍 Browse Products',
      description: 'View all available products',
      onPress: () => navigation.navigate('CRBrowseProduct'),
    },
    {
      title: '📍 Find Products',
      description: 'Locate products in the store',
      onPress: () => navigation.navigate('ProductLocation'),
    },
  
    {
      title: '📋 Shopping List',
      description: 'Create and manage your shopping list',
      onPress: () => navigation.navigate('CRShoppingList'),
    },
  ];

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to TrackNTag</Text>
      </View>

      <View style={styles.quickStats}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{products.length}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {products.filter(p => p.quantity > 0).length}
            </Text>
            <Text style={styles.statLabel}>In Stock</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {products.filter(p => p.expiryDate?.toDate && p.expiryDate.toDate() > new Date()).length}
            </Text>
            <Text style={styles.statLabel}>Active Products</Text>
          </View>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {features.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureCard}
            onPress={feature.onPress}
          >
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.recentProducts}>
        <Text style={styles.sectionTitle}>Recently Added Products</Text>
        {products.slice(0, 3).map((product) => (
          <View key={product.id} style={styles.productCard}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productLocation}>Location: {product.location}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStockItem = ({ item }: { item: Product }) => (
    <View style={styles.stockItem}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={item.quantity > 0 ? styles.inStock : styles.outOfStock}>
        {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
      </Text>
    </View>
  );

  const renderStockSection = () => (
    <View style={styles.inStockSection}>
      <Text style={styles.sectionTitle}>Stock Status</Text>
      {products.slice(0, 5).map((item) => (
        <View key={item.id} style={styles.stockItem}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={item.quantity > 0 ? styles.inStock : styles.outOfStock}>
            {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <>
            {renderHeader()}
            {renderStockSection()}
          </>
        )}
        keyExtractor={() => 'dashboard-content'}
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
  header: {
    backgroundColor: '#2e64e5',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  quickStats: {
    padding: 16,
    marginTop: -20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e64e5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    padding: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2e64e5',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  inStockSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inStock: {
    color: 'green',
    fontWeight: 'bold',
  },
  outOfStock: {
    color: 'red',
    fontWeight: 'bold',
  },
  recentProducts: {
    padding: 16,
    paddingBottom: 32,
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productLocation: {
    fontSize: 14,
    color: '#2e64e5',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 10,
  },
  listContainer: {
    paddingBottom: 32,
  },
  message: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 10,
  },
});

export default CustomerDashboard;
