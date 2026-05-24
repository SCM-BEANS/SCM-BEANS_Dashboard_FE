import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Machine, MachineSchema } from '../schemas/machine';
import { z } from 'zod';

// Mock API endpoint for demonstration
const API_URL = '/api/machines';

const fetchMachines = async (): Promise<Machine[]> => {
  const response = await axios.get(API_URL);
  
  // Validate response with Zod array schema
  const validatedData = z.array(MachineSchema).parse(response.data);
  return validatedData;
};

export const useGetMachines = () => {
  return useQuery({
    queryKey: ['machines'],
    queryFn: fetchMachines,
    // Background refetching options
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};
