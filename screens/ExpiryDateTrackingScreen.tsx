import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  expiryDate: any; // Firestore Timestamp
}

const ExpiryAlertSection: React.FC = () => {
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchExpiringProducts = async () => {
      try {
        const db = getFirestore();
        const productsRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsRef);

        const today = new Date();
        const upcoming = new Date();
        upcoming.setDate(today.getDate() + 15); // Next 15 days

        const products: Product[] = [];

        querySnapshot.forEach(doc => {
          const data = doc.data();

          if (data.expiryDate) {
            const expiry = data.expiryDate.toDate();

            if (expiry <= upcoming && expiry >= today) {
              products.push({
                id: doc.id,
                name: data.name,
                expiryDate: expiry,
              });
            }
          }
        });

        // Sort by expiry date (closest to expiry first)
        products.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

        setExpiringProducts(products);

        // Show notification for critical products (expiring within 7 days)
        const criticalProducts = products.filter(product => {
          const daysUntilExpiry = Math.ceil((product.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 7;
        });

        if (criticalProducts.length > 0) {
          Alert.alert(
            '⚠️ Critical Expiry Alert',
            `${criticalProducts.length} product(s) are expiring within 7 days!`,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchExpiringProducts();
  }, []);

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 3) return { color: '#e74c3c', text: 'Critical' };
    if (daysUntilExpiry <= 7) return { color: '#f39c12', text: 'Warning' };
    return { color: '#2ecc71', text: 'Notice' };
  };

  const renderItem = ({ item }: { item: Product }) => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
    const status = getExpiryStatus(daysUntilExpiry);

    return (
      <View style={styles.itemContainer}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={[styles.expiryDate, { color: status.color }]}>
            {daysUntilExpiry} days left - {status.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expiry Alert (Next 15 Days)</Text>
      <FlatList
        data={expiringProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No products expiring soon.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 10,
    borderRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemContainer: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
  },
  expiryDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#777',
    marginTop: 10,
  },
});

export default ExpiryAlertSection;
