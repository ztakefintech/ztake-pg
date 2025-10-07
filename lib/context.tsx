'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Vendor {
  id: number;
  email: string;
  business_name: string;
  contact_name: string;
  phone?: string;
  upi_id: string;
}

interface AuthContextType {
  vendor: Vendor | null;
  token: string | null;
  login: (vendor: Vendor, token: string) => void;
  logout: () => void;
  updateVendor: (updatedVendor: Vendor) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedVendor = localStorage.getItem('vendor_data');
    
    if (storedToken && storedVendor) {
      setToken(storedToken);
      setVendor(JSON.parse(storedVendor));
    }
    setIsLoading(false);
  }, []);

  const login = (vendorData: Vendor, authToken: string) => {
    setVendor(vendorData);
    setToken(authToken);
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('vendor_data', JSON.stringify(vendorData));
  };

  const logout = () => {
    setVendor(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('vendor_data');
  };

  const updateVendor = (updatedVendor: Vendor) => {
    setVendor(updatedVendor);
    localStorage.setItem('vendor_data', JSON.stringify(updatedVendor));
  };

  const isAuthenticated = !!vendor && !!token;

  return (
    <AuthContext.Provider value={{ vendor, token, login, logout, updateVendor, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
