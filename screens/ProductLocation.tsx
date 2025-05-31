import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

type Product = {
  id: string;
  name?: string;
  location?: string;
};

export default function ProductLocation() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedByLocation, setGroupedByLocation] = useState<{ [key: string]: Product[] }>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProductsBySearch();
  }, [searchTerm, allProducts]);

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const items: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllProducts(items);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filterProductsBySearch = () => {
    const filtered = allProducts.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const locationMap: { [key: string]: Product[] } = {};
    filtered.forEach(item => {
      const location = typeof item.location === 'string' ? item.location : 'Unknown';
      if (!locationMap[location]) locationMap[location] = [];
      locationMap[location].push(item);
    });

    setGroupedByLocation(locationMap);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Product Location in Store</Text>

      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Search by product name..."
        placeholderTextColor="#666666"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {Object.keys(groupedByLocation).map(location => (
        <View key={location} style={styles.locationGroup}>
          <Text style={[styles.locationTitle, { color: '#333333' }]}>{location}</Text>
          {groupedByLocation[location].map(product => (
            <Text key={product.id} style={[styles.productItem, { color: '#333333' }]}>
              • {product.name || 'Unnamed Product'}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#333333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  locationGroup: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
  },
  locationTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  productItem: {
    paddingLeft: 10,
    fontSize: 14,
  },
});
