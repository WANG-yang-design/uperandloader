import { API_BASE_URL as DEFAULT_API_URL, ApiResponse, FileItem } from '../types';

const STORAGE_KEY = 'omnicloud_api_url';

export const ApiService = {
  /**
   * Get the current base URL from storage or default
   */
  getBaseUrl: (): string => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL;
  },

  /**
   * Set a new base URL
   */
  setBaseUrl: (url: string) => {
    // Ensure no trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEY, cleanUrl);
  },

  /**
   * Fetch all files
   */
  getList: async (): Promise<FileItem[]> => {
    const baseUrl = ApiService.getBaseUrl();
    try {
      console.log(`Fetching list from: ${baseUrl}/list`);
      const response = await fetch(`${baseUrl}/list`, {
        method: 'GET',
        // 'cors' mode is default, but explicit helps debugging
        mode: 'cors', 
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const json: ApiResponse<FileItem[]> = await response.json();
      
      // Defensive check: Ensure data is an array
      if (json.code === 200 && Array.isArray(json.data)) {
        return json.data;
      } else {
        console.warn("API returned invalid data format", json);
        return []; // Return empty array instead of crashing
      }
    } catch (error) {
      console.error("API Error (getList):", error);
      throw error;
    }
  },

  /**
   * Upload a file
   */
  uploadFile: async (file: File, text?: string): Promise<any> => {
    const baseUrl = ApiService.getBaseUrl();
    const formData = new FormData();
    formData.append('file', file);
    if (text) {
      formData.append('text', text);
    }

    try {
      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const json: ApiResponse<any> = await response.json();
      return json;
    } catch (error) {
      console.error("API Error (uploadFile):", error);
      throw error;
    }
  },

  /**
   * Get direct download/preview URL
   */
  getDownloadUrl: (id: string): string => {
    const baseUrl = ApiService.getBaseUrl();
    return `${baseUrl}/download/${id}`;
  }
};