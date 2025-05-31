import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface Product {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

const InventoryOverviewSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [categoryCount, setCategoryCount] = useState<{ [key: string]: number }>({});
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const data: Product[] = [];
        let quantitySum = 0;
        const categoryMap: { [key: string]: number } = {};

        snapshot.forEach((doc) => {
          const product = { id: doc.id, ...doc.data() } as Product;
          data.push(product);
          quantitySum += Number(product.quantity) || 0;

          if (product.category) {
            categoryMap[product.category] = (categoryMap[product.category] || 0) + 1;
          }
        });

        setProducts(data);
        setTotalQuantity(quantitySum);
        setCategoryCount(categoryMap);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    };

    fetchProducts();
  }, []);

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📦 Detailed Inventory Overview</Text>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Total Products</Text>
            <Text style={styles.detailValue}>{products.length}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Total Quantity</Text>
            <Text style={styles.detailValue}>{totalQuantity}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Categories</Text>
            {Object.entries(categoryCount).map(([category, count]) => (
              <View key={category} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryCount}>{count} items</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => setIsModalVisible(true)}
    >
      <Text style={styles.title}>📦 Inventory Overview</Text>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Products</Text>
          <Text style={styles.summaryValue}>{products.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Quantity</Text>
          <Text style={styles.summaryValue}>{totalQuantity}</Text>
        </View>
      </View>
      {renderModal()}
    </TouchableOpacity>
  );
};

export default InventoryOverviewSection;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eef',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e64e5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  detailValue: {
    fontSize: 24,
    color: '#2e64e5',
    fontWeight: 'bold',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryCount: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#2e64e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
