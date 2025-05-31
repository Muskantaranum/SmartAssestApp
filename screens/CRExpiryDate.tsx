import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface Product {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  expiryDate?: any; // Firestore Timestamp
}

const CRExpiryDate = () => {
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchExpiringProducts();
  }, []);

  const fetchExpiringProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // Check for expiring products within 15 days
      const today = new Date();
      const fifteenDaysFromNow = new Date();
      fifteenDaysFromNow.setDate(today.getDate() + 15);
      
      const expiring = productsList.filter(product => {
        if (product.expiryDate?.toDate) {
          const expiryDate = product.expiryDate.toDate();
          return expiryDate >= today && expiryDate <= fifteenDaysFromNow;
        }
        return false;
      });

      // Sort by expiry date (closest to expiry first)
      expiring.sort((a, b) => {
        const dateA = a.expiryDate?.toDate() || new Date(0);
        const dateB = b.expiryDate?.toDate() || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
      
      setExpiringProducts(expiring);

      // Show notification if there are expiring products
      if (expiring.length > 0) {
        const criticalProducts = expiring.filter(product => {
          const expiryDate = product.expiryDate?.toDate();
          if (!expiryDate) return false;
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 7; // Products expiring within 7 days are critical
        });

        if (criticalProducts.length > 0) {
          Alert.alert(
            '⚠️ Critical Expiry Alert',
            `${criticalProducts.length} product(s) are expiring within 7 days!`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error fetching expiring products:', error);
    }
  };

  const getDaysUntilExpiry = (expiryDate: any) => {
    const today = new Date();
    const expiry = expiryDate?.toDate();
    if (!expiry) return 0;
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry;
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 3) return { color: '#e74c3c', text: 'Critical' };
    if (daysUntilExpiry <= 7) return { color: '#f39c12', text: 'Warning' };
    return { color: '#2ecc71', text: 'Notice' };
  };

  const renderExpiringItem = ({ item }: { item: Product }) => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
    const status = getExpiryStatus(daysUntilExpiry);

    return (
      <View style={styles.expiringItem}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
        <View style={styles.expiryInfo}>
          <Text style={[styles.expiryDate, { color: status.color }]}>
            {daysUntilExpiry} days left
          </Text>
          <Text style={[styles.expiryStatus, { color: status.color }]}>
            {status.text}
          </Text>
          <Text style={styles.quantity}>Qty: {item.quantity}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: '#333333' }]}>⚠️ Products Expiring Soon (15 Days)</Text>
      <FlatList
        data={expiringProducts}
        keyExtractor={item => item.id}
        renderItem={renderExpiringItem}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: '#333333' }]}>No products expiring in the next 15 days.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  expiringItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#333333',
  },
  expiryInfo: {
    alignItems: 'flex-end',
  },
  expiryDate: {
    fontWeight: '500',
    marginBottom: 4,
  },
  expiryStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#333333',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default CRExpiryDate; 