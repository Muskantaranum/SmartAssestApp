import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const ProductList = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setFilteredProducts(productsData);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Products</Text>
      <TextInput
        style={[styles.searchInput, { color: '#333333' }]}
        placeholder="Search products..."
        placeholderTextColor="#666666"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={[styles.name, { color: '#333333' }]}>{item.name}</Text>
            <Text style={{ color: '#333333' }}>Category: {item.category}</Text>
            <Text style={{ color: '#333333' }}>Location: {item.location}</Text>
            <Text style={{ color: '#333333' }}>Quantity: {item.quantity}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: '#333333' }]}>
            {searchTerm ? 'No products found matching your search.' : 'No products available.'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  card: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 10 },
  name: { fontWeight: 'bold', fontSize: 16 },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  }
});

export default ProductList;