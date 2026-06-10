'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { GeneratedVideo, AppSettings, GenerationState } from '@/types';
import { storage } from './utils';

/**
 * 应用状态接口
 */
interface AppState {
  settings: AppSettings;
  generationState: GenerationState;
  videos: GeneratedVideo[];
}

/**
 * 应用动作类型
 * 定义所有可能的state更新操作
 */
type AppAction =
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'SET_DOUBAO_API_KEY'; payload: string }
  | { type: 'SET_AGNES_API_KEY'; payload: string }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'START_GENERATION' }
  | { type: 'SET_GENERATION_PROGRESS'; payload: number }
  | { type: 'GENERATION_SUCCESS'; payload: GeneratedVideo }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_VIDEO'; payload: GeneratedVideo }
  | { type: 'REMOVE_VIDEO'; payload: string }
  | { type: 'LOAD_SAVED_DATA'; payload: { settings: AppSettings; videos: GeneratedVideo[] } };

/**
 * 初始状态
 */
const initialState: AppState = {
  settings: {
    apiKey: '',
    doubaoApiKey: '',
    agnesApiKey: '',
    defaultModel: 'fal-ai',
    defaultResolution: '1080p',
    defaultDuration: '5',
    defaultAspectRatio: '16:9',
    saveDirectory: '',
  },
  generationState: {
    isGenerating: false,
    progress: 0,
    currentVideo: null,
    error: null,
  },
  videos: [],
};

/**
 * 状态Reducer函数
 * 处理所有状态更新操作
 * @param state - 当前状态
 * @param action - 执行的动作
 * @returns 新的状态
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_API_KEY':
      const newSettings = { ...state.settings, apiKey: action.payload };
      storage.set('app_settings', newSettings);
      return {
        ...state,
        settings: newSettings,
      };

    case 'SET_DOUBAO_API_KEY':
      const newDoubaoSettings = { ...state.settings, doubaoApiKey: action.payload };
      storage.set('app_settings', newDoubaoSettings);
      return {
        ...state,
        settings: newDoubaoSettings,
      };

    case 'SET_AGNES_API_KEY':
      const newAgnesSettings = { ...state.settings, agnesApiKey: action.payload };
      storage.set('app_settings', newAgnesSettings);
      return {
        ...state,
        settings: newAgnesSettings,
      };

    case 'SET_SETTINGS':
      const updatedSettings = { ...state.settings, ...action.payload };
      storage.set('app_settings', updatedSettings);
      return {
        ...state,
        settings: updatedSettings,
      };

    case 'START_GENERATION':
      return {
        ...state,
        generationState: {
          isGenerating: true,
          progress: 0,
          currentVideo: null,
          error: null,
        },
      };

    case 'SET_GENERATION_PROGRESS':
      return {
        ...state,
        generationState: {
          ...state.generationState,
          progress: action.payload,
        },
      };

    case 'GENERATION_SUCCESS':
      const newVideos = [action.payload, ...state.videos];
      storage.set('generated_videos', newVideos);
      return {
        ...state,
        generationState: {
          isGenerating: false,
          progress: 100,
          currentVideo: action.payload,
          error: null,
        },
        videos: newVideos,
      };

    case 'GENERATION_ERROR':
      return {
        ...state,
        generationState: {
          isGenerating: false,
          progress: 0,
          currentVideo: null,
          error: action.payload,
        },
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        generationState: {
          ...state.generationState,
          error: null,
        },
      };

    case 'ADD_VIDEO':
      const videosWithNew = [action.payload, ...state.videos];
      storage.set('generated_videos', videosWithNew);
      return {
        ...state,
        videos: videosWithNew,
      };

    case 'REMOVE_VIDEO':
      const filteredVideos = state.videos.filter(video => video.id !== action.payload);
      storage.set('generated_videos', filteredVideos);
      return {
        ...state,
        videos: filteredVideos,
      };

    case 'LOAD_SAVED_DATA':
      return {
        ...state,
        settings: action.payload.settings,
        videos: action.payload.videos,
      };

    default:
      return state;
  }
}

/**
 * 应用上下文
 */
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

/**
 * 应用Provider组件
 * 包装整个应用，提供全局状态管理
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 组件挂载时加载保存的数据
  useEffect(() => {
    const savedSettings = storage.get('app_settings') || initialState.settings;
    const savedVideos = (storage.get('generated_videos') || []).map((video: any) => ({
      ...video,
      createdAt: new Date(video.createdAt) // 确保日期对象正确转换
    }));
    
    dispatch({
      type: 'LOAD_SAVED_DATA',
      payload: { settings: savedSettings, videos: savedVideos },
    });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * 使用应用上下文的Hook
 * @returns 应用状态和dispatch函数
 * @throws 如果在AppProvider外使用会抛出错误
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp必须在AppProvider内部使用');
  }
  return context;
}
