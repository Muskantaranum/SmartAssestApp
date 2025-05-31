import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Dashboard: undefined;
  UserDashboard: undefined;
  CustomerDashboard: undefined;
};

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      // Query Firestore for user with matching email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Login Failed', 'User not found.');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Check password manually
      if (userData.password !== password) {
        Alert.alert('Login Failed', 'Incorrect password.');
        return;
      }

      const userRole = userData.role;

      if (userRole === 'admin') {
        navigation.navigate('Dashboard');
      } else if (userRole === 'customer') {
        navigation.navigate('CustomerDashboard');
      } else {
        Alert.alert('Error', 'User role is not defined. Please contact admin.');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Login Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);

      // Check if email already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert('Registration Failed', 'Email already exists.');
        return;
      }

      // Add new user
      await addDoc(collection(db, 'users'), {
        email,
        password,
        name,
        role: 'customer', // Only allow customer registration
        createdAt: new Date(),
      });

      Alert.alert('Success', 'Registration successful! Please login.');
      setIsRegistering(false);
      setEmail('');
      setPassword('');
      setName('');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Registration Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.appTitle}>Smart Asset</Text>
            <Text style={styles.appSubtitle}>Inventory Management</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isRegistering 
                ? 'Sign up to get started' 
                : 'Sign in to continue'}
            </Text>

            {isRegistering && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={isRegistering ? handleRegister : handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <Text style={styles.switchButtonText}>
                {isRegistering
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Create one"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 24,
    padding: 8,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
