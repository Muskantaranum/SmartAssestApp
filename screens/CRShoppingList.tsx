import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ShoppingItem {
  id: string;
  text: string;
  isChecked: boolean;
  createdAt: number;
}

const ShoppingList = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    // Set up real-time listener for shopping items
    const q = query(collection(db, 'shoppingItems'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData: ShoppingItem[] = [];
      querySnapshot.forEach((doc) => {
        itemsData.push({ id: doc.id, ...doc.data() } as ShoppingItem);
      });
      setItems(itemsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addItem = async () => {
    if (!newItem.trim()) return;

    try {
      const newShoppingItem: Omit<ShoppingItem, 'id'> = {
        text: newItem.trim(),
        isChecked: false,
        createdAt: Date.now()
      };

      const docRef = doc(collection(db, 'shoppingItems'));
      await setDoc(docRef, newShoppingItem);
      setNewItem('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const toggleItem = async (item: ShoppingItem) => {
    try {
      const itemRef = doc(db, 'shoppingItems', item.id);
      await setDoc(itemRef, {
        ...item,
        isChecked: !item.isChecked
      }, { merge: true });
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingItems', itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const clearAllItems = async () => {
    try {
      const deletePromises = items.map(item => 
        deleteDoc(doc(db, 'shoppingItems', item.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing all items:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading your shopping list...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Shopping List</Text>
          {items.length > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={clearAllItems}
            >
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Add items you need to buy</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            inputFocused ? styles.inputFocused : styles.inputBlurred
          ]}
          placeholder="Add item to buy..."
          placeholderTextColor="#95a5a6"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addItem}
          returnKeyType="done"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addItem}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.itemCard, item.isChecked && styles.checkedItemCard]}
            onPress={() => toggleItem(item)}
          >
            <View style={styles.itemContent}>
              <View style={[styles.checkbox, item.isChecked && styles.checkedBox]}>
                {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.itemText, item.isChecked && styles.checkedItemText]}>
                {item.text}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteItem(item.id)}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Your shopping list is empty. Add items you need to buy!</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff'
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
    minHeight: 50,
  },
  inputFocused: {
    borderColor: '#3498db',
    backgroundColor: '#fff',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputBlurred: {
    borderColor: '#3498db',
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkedItemCard: {
    backgroundColor: '#f0f0f0',
    borderColor: '#bdc3c7',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  checkedItemText: {
    textDecorationLine: 'line-through',
    color: '#7f8c8d',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
  message: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
  clearAllButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ShoppingList;
