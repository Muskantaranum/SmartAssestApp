import { Device } from '../types/IoT';

class IoTService {
  private static instance: IoTService;
  private devices: Map<string, Device> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  private constructor() {}

  static getInstance(): IoTService {
    if (!IoTService.instance) {
      IoTService.instance = new IoTService();
    }
    return IoTService.instance;
  }

  async connectToDevice(deviceId: string, ipAddress: string, port: number = 81): Promise<boolean> {
    try {
      const ws = new WebSocket(`ws://${ipAddress}:${port}`);
      
      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          this.wsConnections.set(deviceId, ws);
          this.setupWebSocketListeners(deviceId, ws);
          resolve(true);
        };

        ws.onerror = (error) => {
          console.error(`WebSocket connection error for device ${deviceId}:`, error);
          reject(error);
        };

        // Set a timeout for connection
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error(`Failed to connect to device ${deviceId}:`, error);
      return false;
    }
  }

  private setupWebSocketListeners(deviceId: string, ws: WebSocket) {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleDeviceData(deviceId, data);
      } catch (error) {
        console.error(`Error parsing data from device ${deviceId}:`, error);
      }
    };

    ws.onclose = () => {
      console.log(`Connection closed for device ${deviceId}`);
      this.wsConnections.delete(deviceId);
      // Notify listeners about disconnection
      this.notifyDeviceStatusChange(deviceId, 'disconnected');
    };
  }

  private handleDeviceData(deviceId: string, data: any) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    switch (data.type) {
      case 'shock':
        this.handleShockData(deviceId, data);
        break;
      case 'weight':
        this.handleWeightData(deviceId, data);
        break;
      case 'status':
        this.handleStatusUpdate(deviceId, data);
        break;
      default:
        console.warn(`Unknown data type from device ${deviceId}:`, data.type);
    }
  }

  private handleShockData(deviceId: string, data: any) {
    // Update device state
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastShock = {
        timestamp: new Date(),
        weight: data.weight,
        location: data.location
      };
      this.devices.set(deviceId, device);
      // Notify listeners about shock detection
      this.notifyShockDetection(deviceId, data);
    }
  }

  private handleWeightData(deviceId: string, data: any) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.currentWeight = data.weight;
      device.lastUpdate = new Date();
      this.devices.set(deviceId, device);
      // Notify listeners about weight update
      this.notifyWeightUpdate(deviceId, data.weight);
    }
  }

  private handleStatusUpdate(deviceId: string, data: any) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = data.status;
      device.lastUpdate = new Date();
      this.devices.set(deviceId, device);
      // Notify listeners about status change
      this.notifyDeviceStatusChange(deviceId, data.status);
    }
  }

  // Event listeners
  private listeners: {
    shockDetection: Array<(deviceId: string, data: any) => void>;
    weightUpdate: Array<(deviceId: string, weight: number) => void>;
    statusChange: Array<(deviceId: string, status: string) => void>;
  } = {
    shockDetection: [],
    weightUpdate: [],
    statusChange: []
  };

  addEventListener(
    event: 'shockDetection',
    callback: (deviceId: string, data: any) => void
  ): void;
  addEventListener(
    event: 'weightUpdate',
    callback: (deviceId: string, weight: number) => void
  ): void;
  addEventListener(
    event: 'statusChange',
    callback: (deviceId: string, status: string) => void
  ): void;
  addEventListener(event: string, callback: any): void {
    if (this.listeners[event as keyof typeof this.listeners]) {
      this.listeners[event as keyof typeof this.listeners].push(callback);
    }
  }

  removeEventListener(
    event: 'shockDetection',
    callback: (deviceId: string, data: any) => void
  ): void;
  removeEventListener(
    event: 'weightUpdate',
    callback: (deviceId: string, weight: number) => void
  ): void;
  removeEventListener(
    event: 'statusChange',
    callback: (deviceId: string, status: string) => void
  ): void;
  removeEventListener(event: string, callback: any): void {
    if (this.listeners[event as keyof typeof this.listeners]) {
      this.listeners[event as keyof typeof this.listeners] = 
        this.listeners[event as keyof typeof this.listeners].filter(cb => cb !== callback);
    }
  }

  private notifyShockDetection(deviceId: string, data: any) {
    this.listeners.shockDetection.forEach(callback => callback(deviceId, data));
  }

  private notifyWeightUpdate(deviceId: string, weight: number) {
    this.listeners.weightUpdate.forEach(callback => callback(deviceId, weight));
  }

  private notifyDeviceStatusChange(deviceId: string, status: string) {
    this.listeners.statusChange.forEach(callback => callback(deviceId, status));
  }

  // Device management
  registerDevice(device: Device) {
    this.devices.set(device.id, device);
  }

  unregisterDevice(deviceId: string) {
    const ws = this.wsConnections.get(deviceId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(deviceId);
    }
    this.devices.delete(deviceId);
  }

  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  disconnectDevice(deviceId: string) {
    const ws = this.wsConnections.get(deviceId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(deviceId);
    }
  }

  disconnectAllDevices() {
    this.wsConnections.forEach((ws, deviceId) => {
      ws.close();
      this.wsConnections.delete(deviceId);
    });
  }
}

export default IoTService; 