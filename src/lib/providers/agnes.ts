// Agnes AI API Client for Agnes-Video-V2.0 model
// API Docs: https://platform.agnes-ai.com

export interface AgnesVideoRequest {
  prompt: string;
  image?: string;           // Single image URL for Image-to-Video
  model?: string;
  duration?: number;        // Seconds (default: 5)
  width?: number;
  height?: number;
}

export interface AgnesVideoResponse {
  task_id: string;
  video_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  video?: {
    url: string;
    width: number;
    height: number;
    content_type: string;
  };
  error?: string;
  prompt?: string;
}

const AGNES_API_BASE = 'https://apihub.agnes-ai.com/v1';
const AGNES_MOCK_VIDEO_URL = 'https://storage.googleapis.com/agnes-aigc/aigc/videos/2026/06/03/video_mocked.mp4';

export class AgnesClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(request: AgnesVideoRequest): Promise<AgnesVideoResponse> {
    const {
      prompt,
      image,
      model = 'agnes-video-v2.0',
      duration = 5,
      width = 1152,
      height = 768,
    } = request;

    if (process.env.NODE_ENV !== 'production' && process.env.AGNES_MOCK_RESPONSE === 'true') {
      return {
        task_id: `task_mock_${Date.now()}`,
        status: 'completed',
        video: {
          url: AGNES_MOCK_VIDEO_URL,
          width,
          height,
          content_type: 'video/mp4',
        },
        prompt,
      };
    }

    const numFrames = Math.floor(duration * 24) + 1;

    const body: any = {
      model,
      prompt,
      height,
      width,
      num_frames: numFrames,
      frame_rate: 24,
    };

    // Image-to-Video: single image
    if (image) {
      body.image = image;
    }

    const response = await fetch(`${AGNES_API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    const status = this.mapStatus(result.status);
    const taskId = result.task_id || result.id || '';
    const videoId = result.video_id || result.videoId || '';
    const videoUrl =
      result.video?.url ||
      result.video_url ||
      result.videoUrl ||
      result.url ||
      result.output?.video_url ||
      '';
    const dimensions = this.parseSize(result.size);

    return {
      task_id: taskId,
      video_id: videoId || undefined,
      status,
      video: status === 'completed' && videoUrl ? {
        url: videoUrl,
        width: dimensions?.width || result.width || width,
        height: dimensions?.height || result.height || height,
        content_type: 'video/mp4',
      } : undefined,
      error: this.extractErrorMessage(result.error),
      prompt,
    };
  }

  async getVideoResult(taskId: string): Promise<AgnesVideoResponse> {
    // 使用任务 ID 查询结果
    const response = await fetch(`${AGNES_API_BASE}/videos/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Map Agnes status to our format
    const status = this.mapStatus(result.status);
    const videoId = result.video_id || result.videoId || '';

    const videoUrl =
      result.video?.url ||
      result.video_url ||
      result.videoUrl ||
      result.url ||
      result.output?.video_url ||
      '';
    const dimensions = this.parseSize(result.size);

    return {
      task_id: taskId,
      video_id: videoId || undefined,
      status,
      progress: typeof result.progress === 'number' ? result.progress : undefined,
      video: status === 'completed' && videoUrl ? {
        url: videoUrl,
        width: dimensions?.width || result.width || 1152,
        height: dimensions?.height || result.height || 768,
        content_type: 'video/mp4',
      } : undefined,
      error: status === 'failed' ? this.extractErrorMessage(result.error) : undefined,
    };
  }

  async pollVideoCompletion(
    taskId: string,
    maxAttempts: number = 24,
    onProgress?: (progress: number) => void,
  ): Promise<AgnesVideoResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.getVideoResult(taskId);

        if (result.progress !== undefined && onProgress) {
          onProgress(result.progress);
        }

        if (result.status === 'completed') {
          return result;
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Video generation failed');
        }

        console.log(`Agnes task ${taskId} status: ${result.status}, progress: ${result.progress ?? 0}%, attempt ${attempt + 1}/${maxAttempts}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`Agnes poll error: ${message}, attempt ${attempt + 1}/${maxAttempts}`);

        const lowerMessage = message.toLowerCase();
        const shouldStopPolling =
          lowerMessage.includes('401') ||
          lowerMessage.includes('403') ||
          lowerMessage.includes('unauthorized') ||
          lowerMessage.includes('forbidden') ||
          lowerMessage.includes('invalid api key') ||
          lowerMessage.includes('video generation failed');

        if (shouldStopPolling) {
          throw error;
        }
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Video generation timeout after 2 minutes');
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test with a minimal request
      const response = await fetch(`${AGNES_API_BASE}/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'agnes-video-v2.0',
          prompt: 'test',
          num_frames: 24,
          frame_rate: 24,
          width: 640,
          height: 480,
        }),
      });

      // 400 means key is valid but request is invalid (expected)
      return response.ok || response.status === 400 || response.status === 409;
    } catch {
      return false;
    }
  }

  private mapStatus(agnesStatus?: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (agnesStatus?.toLowerCase()) {
      case 'succeeded':
      case 'completed':
      case 'done':
      case 'success':
        return 'completed';
      case 'processing':
      case 'running':
      case 'pending':
      case 'in_progress':
        return 'processing';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!error) {
      return undefined;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' ? message : undefined;
    }

    return undefined;
  }

  private parseSize(size?: string): { width: number; height: number } | undefined {
    if (!size) {
      return undefined;
    }

    const match = size.match(/^(\d+)x(\d+)$/i);
    if (!match) {
      return undefined;
    }

    return {
      width: Number(match[1]),
      height: Number(match[2]),
    };
  }
}
