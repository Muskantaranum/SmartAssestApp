export interface ShockEvent {
  timestamp: Date;
  weight: number;
  location: string;
}

export interface Device {
  id: string;
  name: string;
  type: 'weight' | 'shock' | 'combined';
  ipAddress: string;
  port: number;
  status: 'connected' | 'disconnected' | 'error';
  currentWeight?: number;
  lastShock?: ShockEvent;
  lastUpdate?: Date;
  location: string;
  calibration?: {
    factor: number;
    offset: number;
  };
  settings?: {
    shockThreshold: number;
    updateInterval: number;
    autoReconnect: boolean;
  };
}

export type DeviceStatus = 'connected' | 'disconnected' | 'error';
export type DeviceType = 'weight' | 'shock' | 'combined';

export interface DeviceData {
  type: 'shock' | 'weight' | 'status';
  weight?: number;
  location?: string;
  status?: DeviceStatus;
  timestamp?: number;
} 