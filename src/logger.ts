// Simple logger implementation
export const logger = {
  info: (data: any, message?: string) => {
    console.log(`[INFO] ${message || ''}`, data);
  },
  error: (data: any, message?: string) => {
    console.error(`[ERROR] ${message || ''}`, data);
  }
};
