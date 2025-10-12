'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
}

interface WebSocketOptions {
  onEvent?: (event: WebSocketEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pollInterval?: number;
}

interface WebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
  connectionCount: number;
}

/**
 * WebSocket-like hook using polling for real-time updates
 * This simulates WebSocket behavior using periodic polling
 */
export function useWebSocket(options: WebSocketOptions = {}): WebSocketReturn {
  const {
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    pollInterval = 2000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);
  const reconnectAttempts = useRef(0);
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      console.log('Connecting to WebSocket (polling mode)...');
      
      // Simulate connection establishment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;
      onConnect?.();
      
      console.log('WebSocket connected (polling mode)');
      
      // Start polling for events
      startPolling();
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnecting(false);
      setError('Connection failed');
      onError?.(error);
      
      // Attempt to reconnect if not manually disconnected
      if (!isManualDisconnect.current && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [onConnect, onError, reconnectInterval, maxReconnectAttempts]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        // Poll for new events
        const response = await fetch('/api/events/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastEventId })
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.events && data.events.length > 0) {
            console.log(`Polling: Found ${data.events.length} events, lastEventId: ${lastEventId}`);
            data.events.forEach((event: WebSocketEvent) => {
              // Check if we've already processed this event using ref for synchronous check
              if (!processedEventIdsRef.current.has(event.id)) {
                console.log('Received new event:', event);
                onEvent?.(event);
                setLastEventId(event.id);
                processedEventIdsRef.current.add(event.id);
                
                // Clean up old processed event IDs (keep only last 100)
                if (processedEventIdsRef.current.size > 100) {
                  const ids = Array.from(processedEventIdsRef.current);
                  processedEventIdsRef.current = new Set(ids.slice(-100));
                }
              } else {
                console.log('Skipping duplicate event:', event.id);
              }
            });
          } else {
            console.log('Polling: No new events found');
          }
          
          setConnectionCount(data.connectionCount || 0);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't disconnect on polling errors, just log them
      }
    }, pollInterval);
  }, [lastEventId, onEvent, pollInterval]);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // Clear processed events when disconnecting
    processedEventIdsRef.current.clear();
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    
    onDisconnect?.();
    console.log('WebSocket disconnected');
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    isManualDisconnect.current = false;
    reconnectAttempts.current = 0;
    setError(null);
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    reconnect,
    disconnect,
    connectionCount
  };
}

/**
 * Hook for admin WebSocket connection
 */
export function useAdminWebSocket(options: WebSocketOptions = {}): WebSocketReturn {
  return useWebSocket({
    ...options,
    // Admin-specific configuration can be added here
  });
}

/**
 * Hook for vendor WebSocket connection
 */
export function useVendorWebSocket(options: WebSocketOptions = {}): WebSocketReturn {
  return useWebSocket({
    ...options,
    // Vendor-specific configuration can be added here
  });
}
