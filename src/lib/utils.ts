import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * CSS类名合并工具函数
 * 合并多个类名并处理Tailwind CSS冲突
 * @param inputs - 多个类名参数
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 本地存储工具函数
 * 提供安全的localStorage操作，支持服务端渲染
 */
export const storage = {
  /**
   * 从localStorage获取数据
   * @param key - 存储键名
   * @returns 存储的值或null
   */
  get: (key: string): any => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  /**
   * 设置数据到localStorage
   * @param key - 存储键名
   * @param value - 要存储的值
   */
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('保存到localStorage失败:', error);
    }
  },
  
  /**
   * 从localStorage移除数据
   * @param key - 要移除的键名
   */
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('从localStorage移除失败:', error);
    }
  },
};

/**
 * 文件操作工具函数
 */
export const fileUtils = {
  /**
   * 下载视频文件
   * @param url - 视频URL
   * @param filename - 下载文件名
   */
  downloadVideo: async (url: string, filename: string): Promise<void> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('下载视频失败:', error);
      throw error;
    }
  },
  
  /**
   * 验证图片文件类型
   * @param file - 文件对象
   * @returns 是否为有效的图片类型
   */
  validateImageFile: (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    return validTypes.includes(file.type);
  },
  
  /**
   * 获取图片的Data URL
   * @param file - 文件对象
   * @returns Data URL字符串的Promise
   */
  getImageDataUrl: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};

/**
 * 格式化工具函数
 */
export const formatUtils = {
  /**
   * 格式化时长（秒 → 分:秒）
   * @param seconds - 秒数
   * @returns 格式化后的时间字符串
   */
  formatDuration: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  /**
   * 格式化文件大小
   * @param bytes - 字节数
   * @returns 格式化后的大小字符串
   */
  formatFileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },
  
  /**
   * 格式化日期时间
   * @param date - Date对象或日期字符串
   * @returns 格式化后的日期字符串
   */
  formatDate: (date: Date | string): string => {
    // 处理Date对象和localStorage中的日期字符串
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      return '无效日期';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  },
};

/**
 * 验证工具函数
 */
export const validation = {
  /**
   * 验证URL是否有效
   * @param url - 要验证的URL
   * @returns 是否为有效URL
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * 验证提示词是否有效
   * @param prompt - 提示词
   * @returns 是否为有效提示词
   */
  isValidPrompt: (prompt: string): boolean => {
    return prompt.trim().length >= 3 && prompt.trim().length <= 500;
  },
};

/**
 * 生成唯一ID
 * @returns 唯一标识符字符串
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
