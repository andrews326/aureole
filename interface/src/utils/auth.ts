// Mock authentication utilities using localStorage

export interface User {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  selfieUrl?: string;
  createdAt: string;
}

export const AUTH_STORAGE_KEY = 'aureole_auth';
export const USER_STORAGE_KEY = 'aureole_user';

export const saveAuth = (token: string, user: User) => {
  localStorage.setItem(AUTH_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const getAuth = (): { token: string | null; user: User | null } => {
  const token = localStorage.getItem(AUTH_STORAGE_KEY);
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user };
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem(AUTH_STORAGE_KEY);
};

// Mock login
export const mockLogin = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name: email.split('@')[0],
    verified: false,
    createdAt: new Date().toISOString(),
  };
  
  const token = `mock_token_${Date.now()}`;
  return { user, token };
};

// Mock signup
export const mockSignup = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name: email.split('@')[0],
    verified: false,
    createdAt: new Date().toISOString(),
  };
  
  const token = `mock_token_${Date.now()}`;
  return { user, token };
};

// Mock social login
export const mockSocialLogin = async (provider: 'google' | 'apple'): Promise<{ user: User; token: string }> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const user: User = {
    id: crypto.randomUUID(),
    email: `user@${provider}.com`,
    name: `${provider} User`,
    verified: false,
    createdAt: new Date().toISOString(),
  };
  
  const token = `mock_token_${Date.now()}`;
  return { user, token };
};
