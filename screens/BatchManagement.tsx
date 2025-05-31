import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BatchManagement = () => {
  return (
    <View style={styles.container}>
      <Text>Batch Management Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BatchManagement; 