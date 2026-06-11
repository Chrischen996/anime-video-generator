// Agnes AI API Client for Agnes-Video-V2.0 model
// API Docs: https://platform.agnes-ai.com

export interface AgnesVideoRequest {
  prompt: string;
  image?: string;
  model?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface AgnesVideoResponse {
  task_id: string;
  video_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  video_url?: string;
  error?: string;
}

const AGNES_API_BASE = 'https://apihub.agnes-ai.com';

export class AgnesClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create video generation task
   * POST /v1/videos
   */
  async generateVideo(request: AgnesVideoRequest): Promise<AgnesVideoResponse> {
    const { prompt, image, model = 'agnes-video-v2.0', duration = 5, width = 1152, height = 768 } = request;

    // Calculate num_frames: duration(s) * frame_rate + 1
    // For 5s video: 5 * 24 + 1 = 121 frames
    const num_frames = duration * 24 + 1;

    const body: any = {
      model,
      prompt,
      height,
      width,
      num_frames,
      frame_rate: 24,
    };

    if (image) {
      body.image = image;
    }

    const response = await fetch(`${AGNES_API_BASE}/v1/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      task_id: result.task_id || result.id,
      video_id: result.video_id,
      status: this.mapStatus(result.status),
      progress: result.progress ?? 0,
    };
  }

  /**
   * Get video generation result
   * GET /agnesapi?video_id=xxx
   */
  async getVideoResult(videoId: string): Promise<AgnesVideoResponse> {
    const response = await fetch(`${AGNES_API_BASE}/agnesapi?video_id=${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      task_id: result.id || result.task_id,
      video_id: videoId,
      status: this.mapStatus(result.status),
      progress: result.progress ?? 0,
      video_url: result.remixed_from_video_id,
      error: result.error,
    };
  }

  /**
   * Poll until video generation completes
   */
  async pollVideoCompletion(
    videoId: string,
    onProgress?: (progress: number) => void,
  ): Promise<AgnesVideoResponse> {
    while (true) {
      try {
        const result = await this.getVideoResult(videoId);

        if (result.progress !== undefined && onProgress) {
          onProgress(result.progress);
        }

        if (result.status === 'completed') {
          return result;
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Video generation failed');
        }

        console.log(`Agnes video ${videoId} status: ${result.status}, progress: ${result.progress}%`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`Agnes poll error: ${message}`);

        if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
          throw error;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${AGNES_API_BASE}/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'agnes-video-v2.0',
          prompt: 'test',
          num_frames: 25,
          frame_rate: 24,
          width: 640,
          height: 480,
        }),
      });

      return response.ok || response.status === 400 || response.status === 409;
    } catch {
      return false;
    }
  }

  private mapStatus(agnesStatus?: string): 'processing' | 'completed' | 'failed' {
    switch (agnesStatus?.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }
}
