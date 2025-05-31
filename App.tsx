import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/Dashboard';
import CustomerDashboard from './screens/CustomerDashboard';
import ManageProductsScreen from './screens/ManageProducts';
import ProductLocation from './screens/ProductLocation';
import ExpiryDateTrackingScreen from './screens/ExpiryDateTrackingScreen';
import CRBrowseProduct from './screens/CRBrowseProduct'
import CRShoppingList from './screens/CRShoppingList';
import CRExpiryDate from './screens/CRExpiryDate';
import IoTDeviceManager from './screens/IoTDeviceManager';
import ProductCategories from './screens/ProductCategories';
import Analytics from './screens/Analytics';
import BatchManagement from './screens/BatchManagement';
import ScaleScreen from './screens/ScaleScreen';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  CustomerDashboard: undefined;
  ManageProducts: undefined;
  ProductLocation: undefined;
  ExpiryDateTracking: undefined;
  CRBrowseProduct: undefined;
  CRShoppingList: undefined;
  CRExpiryDate: undefined;
  ProductCategories: undefined;
  Analytics: undefined;
  IoTDeviceManager: undefined;
  BatchManagement: undefined;
  Scale: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
        <Stack.Screen name="ManageProducts" component={ManageProductsScreen} />
        <Stack.Screen name="ProductLocation" component={ProductLocation} />
        <Stack.Screen name="ExpiryDateTracking" component={ExpiryDateTrackingScreen} />
        <Stack.Screen name="CRBrowseProduct" component={CRBrowseProduct} />
        <Stack.Screen name="CRShoppingList" component={CRShoppingList} />
        <Stack.Screen name="CRExpiryDate" component={CRExpiryDate} />
        <Stack.Screen name="ProductCategories" component={ProductCategories} />
        <Stack.Screen 
          name="Analytics" 
          component={Analytics}
          options={{
            title: 'Data Analytics',
            headerStyle: {
              backgroundColor: '#2e64e5',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="IoTDeviceManager" 
          component={IoTDeviceManager}
          options={{
            title: 'IoT Device Manager',
            headerStyle: {
              backgroundColor: '#3B82F6',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="BatchManagement" 
          component={BatchManagement}
          options={{
            title: 'Batch Management',
            headerStyle: {
              backgroundColor: '#2e64e5',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="Scale" 
          component={ScaleScreen}
          options={{
            title: 'Smart Scale',
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;