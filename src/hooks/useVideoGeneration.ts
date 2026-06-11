'use client';

import { useState, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { VideoGenerationRequest, GeneratedVideo } from '@/types';
import { generateId, fileUtils } from '@/lib/utils';

export const useVideoGeneration = () => {
  const { state, dispatch } = useApp();
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const generateVideo = useCallback(async (request: VideoGenerationRequest): Promise<void> => {
    console.log('Debug: generateVideo called with model:', request.model);

    dispatch({ type: 'START_GENERATION' });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Agnes API key header if using Agnes model
      if (request.model === 'agnes' && state.settings.agnesApiKey) {
        headers['x-agnes-api-key'] = state.settings.agnesApiKey;
      }

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!result.success) {
        dispatch({
          type: 'GENERATION_ERROR',
          payload: result.error || 'Failed to generate video',
        });
        return;
      }

      // For Agnes model, poll for progress
      if (request.model === 'agnes' && result.data?.video_id) {
        const pollProgress = async () => {
          while (true) {
            try {
              const statusResponse = await fetch('/api/agnes-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  video_id: result.data.video_id,
                  api_key: state.settings.agnesApiKey,
                }),
              });

              const statusData = await statusResponse.json();

              if (statusData.success) {
                dispatch({
                  type: 'SET_GENERATION_PROGRESS',
                  payload: statusData.data.progress,
                });

                if (statusData.data.status === 'completed') {
                  break;
                }
              }
            } catch (error) {
              console.error('Progress polling error:', error);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        };

        // Start polling in background
        pollProgress().catch(console.error);
      }

      const originalUrl: string = result.data.video.url;

      // Create a GeneratedVideo object
      const generatedVideo: GeneratedVideo = {
        id: generateId(),
        url: originalUrl,
        originalUrl,
        prompt: request.prompt,
        imageUrl: request.image_url,
        createdAt: new Date(),
        resolution: (result.data.resolution as string) || request.resolution || '1080p',
        duration: String((result.data.duration as any) || request.duration || '5'),
        aspectRatio: (result.data.ratio as string) || request.aspect_ratio || '16:9',
        model: request.model,
        seed: (result.data.seed as number) || undefined,
        ratio: (result.data.ratio as string) || undefined,
        framesPerSecond: (result.data.framespersecond as number) || undefined,
        taskId: (result.data.task_id as string) || undefined,
        videoId: (result.data.video_id as string) || undefined,
        status: (result.data.status as any) || undefined,
      };

      dispatch({
        type: 'GENERATION_SUCCESS',
        payload: generatedVideo,
      });

    } catch (error: any) {
      dispatch({
        type: 'GENERATION_ERROR',
        payload: error.message || 'An unexpected error occurred',
      });
    }
  }, [dispatch]);

  const generateTextToVideo = useCallback(async (
    prompt: string,
    options?: {
      resolution?: '480p' | '720p' | '1080p';
      duration?: '5' | '10';
      aspect_ratio?: '16:9' | '9:16' | '1:1';
      model?: 'fal-ai' | 'doubao' | 'agnes';
    }
  ) => {
    const request: VideoGenerationRequest = {
      prompt,
      resolution: options?.resolution || state.settings.defaultResolution,
      duration: options?.duration || state.settings.defaultDuration,
      aspect_ratio: options?.aspect_ratio || state.settings.defaultAspectRatio,
      model: options?.model || state.settings.defaultModel,
      mode: 'ti2vid',
    };

    await generateVideo(request);
  }, [generateVideo, state.settings]);

  const generateImageToVideo = useCallback(async (
    prompt: string,
    imageUrl: string,
    options?: {
      resolution?: '480p' | '720p' | '1080p';
      duration?: '5' | '10';
      model?: 'fal-ai' | 'doubao' | 'agnes';
    }
  ) => {
    const request: VideoGenerationRequest = {
      prompt,
      image_url: imageUrl,
      resolution: options?.resolution || state.settings.defaultResolution,
      duration: options?.duration || state.settings.defaultDuration,
      model: options?.model || state.settings.defaultModel,
    };

    await generateVideo(request);
  }, [generateVideo, state.settings]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!fileUtils.validateImageFile(file)) {
      dispatch({
        type: 'GENERATION_ERROR',
        payload: 'Please select a valid image file (JPG, PNG, WEBP, GIF, AVIF)',
      });
      return;
    }

    try {
      const dataUrl = await fileUtils.getImageDataUrl(file);
      setUploadedImage(file);
      setImagePreview(dataUrl);
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      dispatch({
        type: 'GENERATION_ERROR',
        payload: 'Failed to process the uploaded image',
      });
    }
  }, [dispatch]);

  const clearUploadedImage = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  const downloadVideo = useCallback(async (video: GeneratedVideo) => {
    try {
      const filename = `anime-video-${video.id}.mp4`;
      // Use original URL for download if available, otherwise use proxy URL
      const downloadUrl = video.originalUrl || video.url;
      await fileUtils.downloadVideo(downloadUrl, filename);
    } catch (error) {
      dispatch({
        type: 'GENERATION_ERROR',
        payload: 'Failed to download video',
      });
    }
  }, [dispatch]);

  return {
    // State
    generationState: state.generationState,
    currentVideo: state.generationState.currentVideo,
    isGenerating: state.generationState.isGenerating,
    progress: state.generationState.progress,
    error: state.generationState.error,
    uploadedImage,
    imagePreview,
    
    // Actions
    generateTextToVideo,
    generateImageToVideo,
    handleImageUpload,
    clearUploadedImage,
    clearError,
    downloadVideo,
  };
};
