'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { SystemSettings, DEFAULT_SETTINGS } from '@/lib/api';
import useWebSocket from '@/lib/useWebSocket';
import { io } from 'socket.io-client';

interface SettingsContextType {
  settings: SystemSettings;
  updateSettingsContext: (newSettings: Partial<SystemSettings>) => void;
  isLoading: boolean;
}

const defaultSettings: SystemSettings = DEFAULT_SETTINGS;

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettingsContext: () => {},
  isLoading: true
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial settings via API
  useEffect(() => {
    let isMounted = true;
    api.getSettings().then((data) => {
      if (isMounted) {
        setSettings(data);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  // Listen for real-time setting updates via WebSocket
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005', {
      transports: ['websocket', 'polling'],
    });

    socket.on('settings:update', (data: Partial<SystemSettings>) => {
      setSettings(prev => ({ ...prev, ...data }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateSettingsContext = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Dynamically update page title and favicon
  useEffect(() => {
    if (settings.event_name) {
      document.title = `${settings.event_name} • SCAN • CHECK-IN • SHOW`;
    }
    
    if (settings.event_logo) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.event_logo;
    } else {
      // Revert to default favicon if logo is removed
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = '/favicon.ico';
      }
    }
  }, [settings.event_name, settings.event_logo]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettingsContext, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
