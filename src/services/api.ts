const GAS_API_URL = import.meta.env.VITE_GAS_API_URL || '';

export interface RegistrationData {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  studentId: string;
  year: string;
  branch: string;
  gender?: string;
  city?: string;
  eventId: string;
  eventName: string;
  category: string;
  format: string;
  teamName?: string;
  teamCaptain?: string;
  teamMembers?: string[];
  teamSize?: number;
  paymentRequired: boolean;
  paymentAmount?: number;
  paymentScreenshot?: {
    type: string;
    base64: string;
  };
}

export interface ApiResponse {
  success: boolean;
  registrationId?: string;
  message: string;
  error?: string;
  data?: any;
}

export const apiService = {
  async register(data: RegistrationData): Promise<ApiResponse> {
    if (!GAS_API_URL) {
      console.warn('VITE_GAS_API_URL is not set. Registrations will not be saved.');
      return { success: false, error: 'CONFIG_ERROR', message: 'API URL is not configured.' };
    }

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'register', ...data }),
        // Note: We don't set Content-Type header to avoid CORS preflight issues with GAS
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Server returned error:', response.status, text);
        return { success: false, error: 'SERVER_ERROR', message: `Server error: ${response.status}. Ensure GAS is deployed with "Anyone" access.` };
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Detailed error logging
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        return { 
          success: false, 
          error: 'CORS_OR_NETWORK', 
          message: 'Failed to connect. Check if your GAS Web App URL is correct and deployed with "Anyone" access.' 
        };
      }

      return { success: false, error: 'UNKNOWN_ERROR', message: error.message || 'An unexpected error occurred.' };
    }
  },

  async getRegistrations(password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'get_registrations', password }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR', message: 'Failed to fetch registrations.' };
    }
  },

  async updateStatus(registrationId: string, field: string, value: string, password: string, remarks?: string): Promise<ApiResponse> {
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_status', registrationId, field, value, password, remarks }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR', message: 'Failed to update status.' };
    }
  }
};
