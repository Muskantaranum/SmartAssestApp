import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import type { PickerProps } from '@react-native-picker/picker';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  sales?: number;
  lastUpdated?: Timestamp;
}

interface SalesData {
  date: string;
  amount: number;
}

interface StockData {
  date: string;
  quantity: number;
}

interface FilterOptions {
  category: string;
  dateRange: string;
  productName: string;
  status: string;
}

const Analytics = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    category: 'all',
    dateRange: '7d',
    productName: '',
    status: 'all',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [isChartReady, setIsChartReady] = useState(false);

  // Calculate screen width safely
  const getScreenWidth = useCallback(() => {
    const { width } = Dimensions.get('window');
    return Math.min(width - 32, 400); // Limit maximum width
  }, []);

  useEffect(() => {
    // Delay chart rendering to ensure proper initialization
    const timer = setTimeout(() => {
      setIsChartReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterOptions]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsChartReady(false);

      // Fetch products
      const productsRef = collection(db, 'products');
      let q = query(productsRef);

      // Apply filters
      if (filterOptions.category !== 'all') {
        q = query(q, where('category', '==', filterOptions.category));
      }
      if (filterOptions.productName) {
        q = query(q, where('name', '>=', filterOptions.productName));
      }

      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // Filter by status
      let filteredProducts = productsList;
      if (filterOptions.status === 'low') {
        filteredProducts = productsList.filter(p => p.quantity < 10);
      } else if (filterOptions.status === 'out') {
        filteredProducts = productsList.filter(p => p.quantity === 0);
      }

      setProducts(filteredProducts);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(productsList.map(p => p.category)));
      setCategories(uniqueCategories);

      // Generate mock sales data
      const mockSalesData = generateMockSalesData();
      setSalesData(mockSalesData);

      // Generate stock level trends
      const mockStockData = generateMockStockData(productsList);
      setStockData(mockStockData);

      // Re-enable chart rendering
      setTimeout(() => {
        setIsChartReady(true);
      }, 500);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockSalesData = (): SalesData[] => {
    const data: SalesData[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: Math.floor(Math.random() * 1000) + 500,
      });
    }
    return data;
  };

  const generateMockStockData = (products: Product[]): StockData[] => {
    const data: StockData[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        quantity: totalQuantity + Math.floor(Math.random() * 50) - 25,
      });
    }
    return data;
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 100, 229, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2e64e5',
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  const renderChartWrapper = (children: React.ReactNode) => (
    <View style={styles.chartWrapper}>
      {!isChartReady ? (
        <View style={styles.chartLoading}>
          <ActivityIndicator size="small" color="#2e64e5" />
        </View>
      ) : (
        children
      )}
    </View>
  );

  const renderSalesChart = () => {
    if (!isChartReady || salesData.length === 0) return null;

    return renderChartWrapper(
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Sales</Text>
        <BarChart
          data={{
            labels: salesData.map(d => d.date),
            datasets: [{
              data: salesData.map(d => d.amount)
            }]
          }}
          width={getScreenWidth()}
          height={220}
          yAxisLabel="$"
          yAxisSuffix=""
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars
          segments={4}
        />
      </View>
    );
  };

  const renderStockTrendChart = () => {
    if (!isChartReady || stockData.length === 0) return null;

    return renderChartWrapper(
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Stock Levels Trend</Text>
        <LineChart
          data={{
            labels: stockData.map(d => d.date),
            datasets: [{
              data: stockData.map(d => d.quantity)
            }]
          }}
          width={getScreenWidth()}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          bezier
          fromZero
          segments={4}
        />
      </View>
    );
  };

  const renderTopProductsChart = () => {
    if (!isChartReady) return null;

    const topProducts = [...products]
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 5);

    if (topProducts.length === 0) return null;

    const pieData = topProducts.map((product, index) => ({
      name: product.name,
      sales: product.sales || 0,
      color: `rgba(46, 100, 229, ${1 - index * 0.15})`,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));

    return renderChartWrapper(
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Selling Products</Text>
        <PieChart
          data={pieData}
          width={getScreenWidth()}
          height={220}
          chartConfig={chartConfig}
          accessor="sales"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          absolute
          hasLegend={true}
          center={[getScreenWidth() / 4, 0]}
        />
      </View>
    );
  };

  const renderLowStockTable = () => (
    <View style={styles.tableContainer}>
      <Text style={styles.chartTitle}>Low Stock Items</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Product</Text>
        <Text style={[styles.tableCell, styles.tableHeaderCell]}>Category</Text>
        <Text style={[styles.tableCell, styles.tableHeaderCell]}>Quantity</Text>
      </View>
      {products
        .filter(p => p.quantity < 10)
        .map(product => (
          <View key={product.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{product.name}</Text>
            <Text style={styles.tableCell}>{product.category}</Text>
            <Text style={[styles.tableCell, { color: product.quantity === 0 ? 'red' : 'orange' }]}>
              {product.quantity}
            </Text>
          </View>
        ))}
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Data</Text>
          
          <Text style={styles.filterLabel}>Category</Text>
          <Picker
            selectedValue={filterOptions.category}
            onValueChange={(value: string) => setFilterOptions(prev => ({ ...prev, category: value }))}
            style={styles.picker}
          >
            <Picker.Item label="All Categories" value="all" />
            {categories.map(category => (
              <Picker.Item key={category} label={category} value={category} />
            ))}
          </Picker>

          <Text style={styles.filterLabel}>Date Range</Text>
          <Picker
            selectedValue={filterOptions.dateRange}
            onValueChange={(value: string) => setFilterOptions(prev => ({ ...prev, dateRange: value }))}
            style={styles.picker}
          >
            <Picker.Item label="Last 7 Days" value="7d" />
            <Picker.Item label="Last 30 Days" value="30d" />
            <Picker.Item label="Last 90 Days" value="90d" />
          </Picker>

          <Text style={styles.filterLabel}>Product Name</Text>
          <TextInput
            style={styles.input}
            value={filterOptions.productName}
            onChangeText={(text) => setFilterOptions(prev => ({ ...prev, productName: text }))}
            placeholder="Search by product name"
          />

          <Text style={styles.filterLabel}>Status</Text>
          <Picker
            selectedValue={filterOptions.status}
            onValueChange={(value: string) => setFilterOptions(prev => ({ ...prev, status: value }))}
            style={styles.picker}
          >
            <Picker.Item label="All Items" value="all" />
            <Picker.Item label="Low Stock" value="low" />
            <Picker.Item label="Out of Stock" value="out" />
          </Picker>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.closeButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e64e5" />
          <Text style={styles.loadingText}>Loading analytics data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Analytics</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>Filter Data</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
      >
        {renderSalesChart()}
        {renderStockTrendChart()}
        {renderTopProductsChart()}
        {renderLowStockTable()}
      </ScrollView>

      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2e64e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#2e64e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  tableContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontWeight: '600',
    color: '#666',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#2e64e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chartWrapper: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 252, // Height + padding
  },
  chartLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
  },
});

export default Analytics; 