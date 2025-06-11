import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
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
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface Batch {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  manufacturingDate: Timestamp;
  expiryDate: Timestamp;
  quantity: number;
  supplier: string;
  status: 'active' | 'recalled' | 'depleted';
  remainingQuantity: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  location: string;
}

const BatchManagement = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'recalled' | 'depleted'>('all');

  // New batch form state
  const [newBatch, setNewBatch] = useState({
    productId: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    quantity: '',
    supplier: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchBatches();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    }
  };

  const fetchBatches = async () => {
    try {
      const batchesRef = collection(db, 'batches');
      const q = query(batchesRef, orderBy('manufacturingDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const batchesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Batch[];
      setBatches(batchesList);
    } catch (error) {
      console.error('Error fetching batches:', error);
      Alert.alert('Error', 'Failed to load batches');
    }
  };

  const handleAddBatch = async () => {
    // Debug logging
    console.log('Form values:', newBatch);
    
    // Check each field individually and log which one is empty
    const emptyFields = [];
    if (!newBatch.productId) emptyFields.push('Product');
    if (!newBatch.batchNumber) emptyFields.push('Batch Number');
    if (!newBatch.manufacturingDate) emptyFields.push('Manufacturing Date');
    if (!newBatch.expiryDate) emptyFields.push('Expiry Date');
    if (!newBatch.quantity) emptyFields.push('Quantity');
    if (!newBatch.supplier) emptyFields.push('Supplier');
    
    if (emptyFields.length > 0) {
      console.log('Empty fields:', emptyFields);
      Alert.alert('Error', `Please fill the following fields: ${emptyFields.join(', ')}`);
      return;
    }

    // Validate date formats
    const manufacturingDate = new Date(newBatch.manufacturingDate);
    const expiryDate = new Date(newBatch.expiryDate);
    
    if (isNaN(manufacturingDate.getTime())) {
      Alert.alert('Error', 'Invalid manufacturing date format. Please use YYYY-MM-DD');
      return;
    }
    
    if (isNaN(expiryDate.getTime())) {
      Alert.alert('Error', 'Invalid expiry date format. Please use YYYY-MM-DD');
      return;
    }

    // Validate quantity is a positive number
    const quantity = Number(newBatch.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Quantity must be a positive number');
      return;
    }

    try {
      const product = products.find(p => p.id === newBatch.productId);
      if (!product) {
        Alert.alert('Error', 'Selected product not found');
        return;
      }

      const batchData = {
        productId: newBatch.productId,
        productName: product.name,
        batchNumber: newBatch.batchNumber.trim(),
        manufacturingDate: Timestamp.fromDate(manufacturingDate),
        expiryDate: Timestamp.fromDate(expiryDate),
        quantity: quantity,
        supplier: newBatch.supplier.trim(),
        status: 'active' as const,
        remainingQuantity: quantity,
      };

      console.log('Submitting batch data:', batchData);
      await addDoc(collection(db, 'batches'), batchData);
      setIsModalVisible(false);
      setNewBatch({
        productId: '',
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        quantity: '',
        supplier: '',
      });
      fetchBatches();
      Alert.alert('Success', 'Batch added successfully');
    } catch (error) {
      console.error('Error adding batch:', error);
      Alert.alert('Error', 'Failed to add batch');
    }
  };

  const handleRecallBatch = async (batch: Batch) => {
    try {
      const batchRef = doc(db, 'batches', batch.id);
      await updateDoc(batchRef, {
        status: 'recalled',
      });
      fetchBatches();
      Alert.alert('Success', 'Batch recalled successfully');
    } catch (error) {
      console.error('Error recalling batch:', error);
      Alert.alert('Error', 'Failed to recall batch');
    }
  };

  const handleUpdateQuantity = async (batch: Batch, newQuantity: number) => {
    if (newQuantity < 0) {
      Alert.alert('Error', 'Quantity cannot be negative');
      return;
    }

    try {
      const batchRef = doc(db, 'batches', batch.id);
      const status = newQuantity === 0 ? 'depleted' : 'active';
      await updateDoc(batchRef, {
        remainingQuantity: newQuantity,
        status,
      });
      fetchBatches();
      Alert.alert('Success', 'Quantity updated successfully');
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const handleProductSelect = (productId: string) => {
    console.log('Selected product ID:', productId);
    setNewBatch({ ...newBatch, productId });
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || batch.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const renderBatchItem = ({ item }: { item: Batch }) => (
    <View style={[styles.batchCard, item.status === 'recalled' && styles.recalledBatch]}>
      <Text style={styles.batchTitle}>{item.productName}</Text>
      <Text>Batch Number: {item.batchNumber}</Text>
      <Text>Manufacturing Date: {item.manufacturingDate.toDate().toLocaleDateString()}</Text>
      <Text>Expiry Date: {item.expiryDate.toDate().toLocaleDateString()}</Text>
      <Text>Supplier: {item.supplier}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Remaining Quantity: {item.remainingQuantity}</Text>
      
      <View style={styles.batchActions}>
        {item.status === 'active' && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Alert.prompt(
                  'Update Quantity',
                  'Enter new quantity:',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Update',
                      onPress: (value) => {
                        if (value) {
                          handleUpdateQuantity(item, Number(value));
                        }
                      },
                    },
                  ],
                  'plain-text',
                  item.remainingQuantity.toString(),
                );
              }}
            >
              <Text style={styles.actionButtonText}>Update Quantity</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.recallButton]}
              onPress={() => handleRecallBatch(item)}
            >
              <Text style={styles.actionButtonText}>Recall Batch</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderAddBatchModal = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Batch</Text>
          
          <ScrollView>
            <Text style={styles.label}>Product</Text>
            <View style={styles.pickerContainer}>
              {products.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productOption,
                    newBatch.productId === product.id && styles.selectedProduct,
                  ]}
                  onPress={() => handleProductSelect(product.id)}
                >
                  <Text style={newBatch.productId === product.id ? styles.selectedProductText : styles.productOptionText}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Batch Number</Text>
            <TextInput
              style={styles.input}
              value={newBatch.batchNumber}
              onChangeText={(text) => setNewBatch({ ...newBatch, batchNumber: text })}
              placeholder="Enter batch number"
              placeholderTextColor="#666666"
            />

            <Text style={styles.label}>Manufacturing Date</Text>
            <TextInput
              style={styles.input}
              value={newBatch.manufacturingDate}
              onChangeText={(text) => setNewBatch({ ...newBatch, manufacturingDate: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666666"
            />

            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              value={newBatch.expiryDate}
              onChangeText={(text) => setNewBatch({ ...newBatch, expiryDate: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666666"
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={newBatch.quantity}
              onChangeText={(text) => setNewBatch({ ...newBatch, quantity: text })}
              placeholder="Enter quantity"
              keyboardType="numeric"
              placeholderTextColor="#666666"
            />

            <Text style={styles.label}>Supplier</Text>
            <TextInput
              style={styles.input}
              value={newBatch.supplier}
              onChangeText={(text) => setNewBatch({ ...newBatch, supplier: text })}
              placeholder="Enter supplier name"
              placeholderTextColor="#666666"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAddButton]}
                onPress={handleAddBatch}
              >
                <Text style={styles.buttonText}>Add Batch</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search batches..."
          placeholderTextColor="#666666"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
            onPress={() => setFilterStatus('all')}
          >
            <Text>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'active' && styles.activeFilter]}
            onPress={() => setFilterStatus('active')}
          >
            <Text>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'recalled' && styles.activeFilter]}
            onPress={() => setFilterStatus('recalled')}
          >
            <Text>Recalled</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'depleted' && styles.activeFilter]}
            onPress={() => setFilterStatus('depleted')}
          >
            <Text>Depleted</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.buttonText}>Add New Batch</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBatches}
        renderItem={renderBatchItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      {renderAddBatchModal()}
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  batchCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recalledBatch: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  batchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: '#2196F3',
  },
  recallButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  productOption: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedProduct: {
    backgroundColor: '#2196F3',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
  },
  modalAddButton: {
    backgroundColor: '#4CAF50',
  },
  productOptionText: {
    color: '#333333',
  },
  selectedProductText: {
    color: '#ffffff',
  },
});

export default BatchManagement; 