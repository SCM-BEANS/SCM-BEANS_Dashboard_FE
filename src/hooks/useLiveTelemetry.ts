import { useEffect, useState, useRef } from 'react';
import { Telemetry, TelemetrySchema } from '../schemas/machine';

// Note: In a real app, replace with an actual WebSocket or MQTT client implementation.
// We are demonstrating how to manage the connection based on selectedMachineId
// and updating a local state array for high-frequency data without mutating React Query cache.

export const useLiveTelemetry = (selectedMachineId: string | null) => {
  const [telemetryData, setTelemetryData] = useState<Telemetry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Clear data when machine changes
    setTelemetryData([]);
    
    if (!selectedMachineId) {
      return;
    }

    // Connect to WebSocket endpoint (mock URL for demonstration)
    const wsUrl = `wss://example-iot-cloud.com/telemetry/${selectedMachineId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to telemetry stream for machine: ${selectedMachineId}`);
    };

    ws.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);
        // Validate incoming data
        const validatedTelemetry = TelemetrySchema.parse(rawData);
        
        // Update local state for chart rendering.
        // We use a functional state update to keep only the latest 100 points
        // Avoid mutating TanStack Query cache here because it's too frequent.
        setTelemetryData((prev) => {
          const newData = [...prev, validatedTelemetry];
          // Keep array size manageable (e.g., last 100 data points)
          if (newData.length > 100) {
            return newData.slice(newData.length - 100);
          }
          return newData;
        });
      } catch (error) {
        console.error('Invalid telemetry data received:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup on unmount or when selectedMachineId changes
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [selectedMachineId]);

  return { telemetryData };
};
