import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
}

interface Category {
  name: string;
  productCount: number;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

const ProductCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategoriesFromProducts();
  }, []);

  const loadCategoriesFromProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      
      // Create a map to group products by category
      const categoryMap: { [key: string]: Category } = {};
      
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() } as Product;
        const categoryName = product.category || 'Uncategorized';
        
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = {
            name: categoryName,
            productCount: 0,
            products: []
          };
        }
        
        categoryMap[categoryName].products.push({
          id: product.id,
          name: product.name,
          quantity: product.quantity || 0
        });
        categoryMap[categoryName].productCount++;
      });
      
      // Convert map to array and sort by product count
      const categoriesArray = Object.values(categoryMap).sort((a, b) => b.productCount - a.productCount);
      setCategories(categoriesArray);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load product categories');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.productCount}>{item.productCount} products</Text>
      </View>
      
      <View style={styles.productsList}>
        {item.products.slice(0, 3).map((product) => (
          <View key={product.id} style={styles.productItem}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productQuantity}>Qty: {product.quantity}</Text>
          </View>
        ))}
        {item.products.length > 3 && (
          <Text style={styles.moreProducts}>
            +{item.products.length - 3} more products...
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Categories</Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No products found in inventory</Text>
        }
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
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  listContainer: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  productCount: {
    fontSize: 14,
    color: '#7f8c8d',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productsList: {
    gap: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productName: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  productQuantity: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  moreProducts: {
    fontSize: 14,
    color: '#3498db',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 32,
  },
});

export default ProductCategories; 