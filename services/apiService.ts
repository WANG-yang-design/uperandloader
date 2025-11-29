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
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true',
        },
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
        return []; 
      }
    } catch (error) {
      console.error("API Error (getList):", error);
      throw error;
    }
  },

  /**
   * Upload a file with Progress Tracking (XHR)
   */
  uploadFileWithProgress: (
    file: File, 
    text: string | undefined, 
    onProgress: (percent: number) => void
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const baseUrl = ApiService.getBaseUrl();
      const formData = new FormData();
      formData.append('file', file);
      if (text) {
        formData.append('text', text);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${baseUrl}/upload`, true);

      // Add Tunnel Bypass headers
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
      xhr.setRequestHeader('Bypass-Tunnel-Reminder', 'true');

      // Upload progress listener
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network Error during upload"));
      };

      xhr.send(formData);
    });
  },

  /**
   * Get direct download/preview URL string
   */
  getDownloadUrl: (id: string): string => {
    const baseUrl = ApiService.getBaseUrl();
    return `${baseUrl}/download/${id}`;
  },

  /**
   * Force download a file with Progress Tracking
   */
  downloadWithProgress: (
    id: string, 
    filename: string,
    onProgress: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const baseUrl = ApiService.getBaseUrl();
      const url = `${baseUrl}/download/${id}`;
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      // Add Tunnel Bypass headers
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
      xhr.setRequestHeader('Bypass-Tunnel-Reminder', 'true');

      // Download progress listener
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
          resolve();
        } else {
          reject(new Error("Download failed"));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during download"));
      };

      xhr.send();
    });
  }
};