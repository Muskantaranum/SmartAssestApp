import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ManageProductsScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchProducts = async () => {
    const q = searchTerm
      ? query(collection(db, 'products'), where('name', '==', searchTerm))
      : query(collection(db, 'products'));

    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setProducts(items);
    checkExpiry(items);
  };

  const checkExpiry = (products: any[]) => {
    const today = new Date();
    products.forEach(product => {
      if (product.expiryDate?.toDate) {
        const expiry = product.expiryDate.toDate();
        if (expiry < today) {
          Alert.alert('Expiry Alert', `${product.name} has expired!`);
        }
      }
    });
  };

  const handleAddOrUpdate = async () => {
    if (!name || !category || !location || !expiryDate || !quantity) {
      return Alert.alert('Please fill all fields.');
    }

    const expiryDateObject = new Date(expiryDate);
    if (isNaN(expiryDateObject.getTime())) {
      return Alert.alert('Invalid expiry date. Use YYYY-MM-DD format.');
    }

    try {
      if (editId) {
        const docRef = doc(db, 'products', editId);
        await updateDoc(docRef, {
          name,
          category,
          location,
          expiryDate: expiryDateObject,
          quantity,
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, 'products'), {
          name,
          category,
          location,
          expiryDate: expiryDateObject,
          quantity,
        });
      }

      setName('');
      setCategory('');
      setLocation('');
      setExpiryDate('');
      setQuantity('');
      fetchProducts();
    } catch (error) {
      console.error('Error adding/updating product:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setCategory(item.category);
    setLocation(item.location);
    setExpiryDate(
      item.expiryDate?.toDate
        ? item.expiryDate.toDate().toISOString().split('T')[0]
        : ''
    );
    setQuantity(item.quantity || '');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'Could not delete the product.');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const renderForm = () => (
    <View style={styles.formContainer}>
      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Product Name"
        placeholderTextColor="#666666"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Category"
        placeholderTextColor="#666666"
        value={category}
        onChangeText={setCategory}
      />
      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Location"
        placeholderTextColor="#666666"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Expiry Date (YYYY-MM-DD)"
        placeholderTextColor="#666666"
        value={expiryDate}
        onChangeText={setExpiryDate}
      />
      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Quantity"
        placeholderTextColor="#666666"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <Button
        title={editId ? 'Update Product' : 'Add Product'}
        onPress={handleAddOrUpdate}
      />

      <TextInput
        style={[styles.input, { color: '#333333' }]}
        placeholder="Search Product"
        placeholderTextColor="#666666"
        value={searchTerm}
        onChangeText={setSearchTerm}
        onSubmitEditing={fetchProducts}
      />
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={[styles.productName, { color: '#333333' }]}>{item.name}</Text>
      <Text style={{ color: '#333333' }}>Category: {item.category}</Text>
      <Text style={{ color: '#333333' }}>Location: {item.location}</Text>
      <Text style={{ color: '#333333' }}>
        Expiry Date:{' '}
        {item.expiryDate?.toDate
          ? item.expiryDate.toDate().toDateString()
          : 'N/A'}
      </Text>
      <Text style={{ color: '#333333' }}>Quantity: {item.quantity}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={styles.editButton}
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Text style={{ color: '#333333' }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
          accessibilityLabel={`Delete ${item.name}`}
        >
          <Text style={{ color: '#333333' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: '#333333' }]}>Manage Products</Text>
      {renderForm()}
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  card: {
    padding: 12,
    backgroundColor: '#e6f7ff',
    borderRadius: 10,
    marginBottom: 10,
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#a8dadc',
    padding: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#fca5a5',
    padding: 8,
    borderRadius: 6,
  },
});
