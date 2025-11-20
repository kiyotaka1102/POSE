const API_BASE_URL = 'http://localhost:8000';

export const videoService = {
  /**
   * Get list of all available videos
   */
  async getVideosList() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/list`);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos list: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching videos list:', error);
      throw error;
    }
  },

  /**
   * Get video URL for a specific camera
   */
  getVideoUrl(cameraFilename: string): string {
    return `${API_BASE_URL}/api/videos/${cameraFilename}`;
  },

  /**
   * Check API health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error('API health check failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking API health:', error);
      throw error;
    }
  },
};
