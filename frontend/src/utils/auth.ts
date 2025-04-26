import { User } from '../types';
import { api } from '../services/api';

const getLocalStorage = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

export const isAuthenticated = (): boolean => {
  const token = getLocalStorage('token');
  return !!token;
};

export const getCurrentUser = (): User | null => {
  const user = getLocalStorage('user');
  return user ? JSON.parse(user) : null;
};

export const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Attempting login with:', { email });
    const response = await api.post('/api/login', { email, password });
    console.log('Login response:', response.data);
    
    if (response.data.access_token) {
      setLocalStorage('token', response.data.access_token);
      setLocalStorage('user', JSON.stringify(response.data.user));
      return { success: true };
    } else {
      return { success: false, error: response.data.error || 'Invalid credentials' };
    }
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    const errorMessage = error.response?.data?.error || 'Failed to connect to server';
    return { success: false, error: errorMessage };
  }
};

export const register = async (user: User): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post('/api/register', user);
    
    if (response.data.success) {
      return { success: true };
    } else {
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    return { success: false, error: 'Failed to connect to server' };
  }
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};