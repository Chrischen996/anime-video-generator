import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { VideoGenerationRequest, VideoGenerationResponse } from '@/types';
import { DoubaoClient } from '@/lib/doubao-client';
import { AgnesClient } from '@/lib/providers/agnes';

// Configure Fal client
fal.config({
  credentials: process.env.FAL_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerationRequest = await request.json();
    const { prompt, image_url, resolution = '1080p', duration = '5', aspect_ratio = '16:9', model = 'fal-ai' } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Route to appropriate model handler
    if (model === 'doubao') {
      return await handleDoubaoGeneration({ prompt, image_url, resolution, duration, aspect_ratio });
    } else if (model === 'agnes') {
      const apiKey = process.env.AGNES_API_KEY?.trim() || '';
      return await handleAgnesGeneration({ prompt, image_url, resolution, duration, aspect_ratio, apiKey });
    } else {
      return await handleFalAiGeneration({ prompt, image_url, resolution, duration, aspect_ratio });
    }

  } catch (error: any) {
    console.error('Video generation error:', error);

    let errorMessage = 'Failed to generate video';

    if (error.message?.includes('rate limit')) {
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('invalid prompt')) {
      errorMessage = 'Invalid prompt. Please try a more detailed description.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please check your account.';
    } else if (error.message?.includes('overdue') || error.message?.includes('Forbidden')) {
      errorMessage = 'API account has overdue balance. Please check your account status.';
    } else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      errorMessage = 'Invalid API key. Please check your API key in settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    const response: VideoGenerationResponse = {
      success: false,
      error: errorMessage,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

async function handleFalAiGeneration({ prompt, image_url, resolution, duration, aspect_ratio }: {
  prompt: string;
  image_url?: string;
  resolution: string;
  duration: string;
  aspect_ratio: string;
}) {
  const startedAt = Date.now();
  if (!process.env.FAL_API_KEY || process.env.FAL_API_KEY === 'your_fal_api_key_here') {
    return NextResponse.json(
      {
        success: false,
        error: 'Fal.ai API key is required. Please configure it in settings.',
      },
      { status: 400 }
    );
  }

  // Configure Fal client
  fal.config({
    credentials: process.env.FAL_API_KEY,
  });

  // Determine which endpoint to use based on whether image_url is provided
  const endpoint = image_url
    ? 'fal-ai/bytedance/seedance/v1/pro/image-to-video'
    : 'fal-ai/bytedance/seedance/v1/pro/text-to-video';

  // Prepare the input based on generation type
  const input = image_url
    ? {
        image_url,
        prompt: `${prompt}, anime style`,
        resolution: resolution as '480p' | '1080p',
        duration: duration as '5' | '10',
      }
    : {
        prompt: `${prompt}, anime style`,
        resolution: resolution as '480p' | '1080p',
        duration: duration as '5' | '10',
        aspect_ratio: aspect_ratio as '16:9' | '9:16' | '1:1' | '21:9' | '4:3' | '3:4',
      };

  console.log(`Generating video with ${endpoint}:`, input);

  // Call Fal.ai API
  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      console.log('Queue update:', update);
    },
  });

  console.log('Generation result:', result);

  // Convert Fal.ai result to our standard format
  const falResult = result as any;
  if (!isFinalStatus(falResult.status)) {
    throw new Error(`Fal.ai generation did not finish successfully: ${falResult.status || 'unknown status'}`);
  }
  const videoUrl = extractVideoUrl(falResult);
  if (!videoUrl) {
    throw new Error('Fal.ai did not return a completed video URL');
  }

  const response: VideoGenerationResponse = {
    success: true,
    data: {
      video: {
        url: videoUrl,
        width: falResult.video?.width || 1280,
        height: falResult.video?.height || 720,
        content_type: falResult.video?.content_type || 'video/mp4'
      },
      seed: falResult.seed || 0,
      has_nsfw_concepts: falResult.has_nsfw_concepts || [false],
      prompt: falResult.prompt || prompt,
      task_id: falResult.task_id || `fal_${Date.now()}`,
      status: 'completed'
    },
  };

  console.log(`Fal.ai generation completed in ${Date.now() - startedAt}ms`);
  return NextResponse.json(response);
}

async function handleDoubaoGeneration({ prompt, image_url, resolution, duration, aspect_ratio }: {
  prompt: string;
  image_url?: string;
  resolution: string;
  duration: string;
  aspect_ratio?: string;
}) {
  const startedAt = Date.now();
  if (!process.env.DOUBAO_API_KEY || process.env.DOUBAO_API_KEY === 'your_doubao_api_key_here') {
    return NextResponse.json(
      {
        success: false,
        error: 'Doubao API key is required. Please configure it in settings.',
      },
      { status: 400 }
    );
  }
  const client = new DoubaoClient(process.env.DOUBAO_API_KEY);

  console.log('Generating video with Doubao:', { prompt, image_url, resolution, duration });

  let result;
  try {
    if (image_url) {
      result = await client.generateImageToVideo({
        prompt,
        image_url,
        resolution,
        duration,
        aspect_ratio: aspect_ratio || '16:9',
      });
    } else {
      result = await client.generateTextToVideo({
        prompt,
        resolution,
        duration,
        aspect_ratio: aspect_ratio || '16:9',
      });
    }

    console.log('Doubao generation result:', result);
    if (!isFinalStatus(result.status)) {
      throw new Error(`Doubao generation did not finish successfully: ${result.status || 'unknown status'}`);
    }
    const videoUrl = extractVideoUrl(result);
    if (!videoUrl) {
      throw new Error('Doubao did not return a completed video URL');
    }

    // Convert Doubao response to match Fal.ai format
    const response: VideoGenerationResponse = {
      success: true,
      data: {
        video: {
          ...result.video,
          url: videoUrl,
        },
        seed: 0, // Doubao doesn't provide seed
        has_nsfw_concepts: [false],
        prompt: result.prompt,
        task_id: result.task_id,
        status: 'completed',
        // Pass through additional metadata from Doubao
        resolution: result.resolution,
        duration: result.duration,
        ratio: result.ratio,
        framespersecond: result.framespersecond,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
    };

    console.log(`Doubao generation completed in ${Date.now() - startedAt}ms`);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Doubao generation error:', error);
    
    let errorMessage = 'Failed to generate video with Doubao';
    if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      errorMessage = 'Invalid Doubao API key. Please check your API key in settings.';
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorMessage = 'Doubao API quota exceeded. Please check your account.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

async function handleAgnesGeneration({ prompt, image_url, resolution, duration, aspect_ratio, apiKey }: {
  prompt: string;
  image_url?: string;
  resolution: string;
  duration: string;
  aspect_ratio?: string;
  apiKey?: string;
}) {
  const startedAt = Date.now();
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Agnes API key is required. Please set AGNES_API_KEY in .env.local or the server environment.',
      },
      { status: 400 }
    );
  }
  const client = new AgnesClient(apiKey);

  console.log('Generating video with Agnes:', { prompt, image_url, resolution, duration });

  // Map resolution to dimensions
  const dimensions = getAgnesDimensions(resolution, aspect_ratio);

  try {
    // Generate video
    const result = await client.generateVideo({
      prompt,
      image: image_url,
      duration: parseInt(duration) || 5,
      width: dimensions.width,
      height: dimensions.height,
    });

    console.log('Agnes generation result:', { taskId: result.task_id, status: result.status });

    if (!result.task_id) {
      throw new Error('Agnes did not return a task ID');
    }

    const pollingId = result.video_id || result.task_id;
    const finalResult =
      result.status === 'completed'
        ? result
        : await client.pollVideoCompletion(pollingId, 24, (progress) => {
            console.log(`Agnes progress: ${progress}%`);
          });

    if (finalResult.status !== 'completed' || !finalResult.video?.url) {
      throw new Error(finalResult.error || 'Agnes did not return a completed video URL');
    }

    // Convert to standard response format
    const response: VideoGenerationResponse = {
      success: true,
      data: {
        video: finalResult.video || {
          url: '',
          width: 1152,
          height: 768,
          content_type: 'video/mp4',
        },
        seed: 0,
        has_nsfw_concepts: [false],
        prompt: finalResult.prompt || prompt,
        task_id: finalResult.task_id,
        video_id: finalResult.video_id,
        status: 'completed',
      },
    };

    console.log(`Agnes generation completed in ${Date.now() - startedAt}ms`);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Agnes generation error:', error);

    let errorMessage = 'Failed to generate video with Agnes';
    if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      errorMessage = 'Invalid Agnes API key. Please check your API key in settings.';
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorMessage = 'Agnes API quota exceeded. Please check your account.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

function getAgnesDimensions(resolution: string, aspect_ratio?: string): { width: number; height: number } {
  // Map resolution and aspect ratio to dimensions
  const baseDimensions: Record<string, { width: number; height: number }> = {
    '480p': { width: 640, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
  };

  const base = baseDimensions[resolution] || baseDimensions['1080p'];

  // Adjust for aspect ratio if provided
  if (aspect_ratio) {
    const [w, h] = aspect_ratio.split(':').map(Number);
    if (w && h) {
      const ratio = w / h;
      if (ratio > 1) {
        // Landscape
        base.height = Math.round(base.width / ratio);
      } else {
        // Portrait
        base.width = Math.round(base.height * ratio);
      }
    }
  }

  return base;
}

function extractVideoUrl(result: any): string {
  return (
    result?.video?.url ||
    result?.video_url ||
    result?.videoUrl ||
    result?.output?.video_url ||
    result?.output?.videoUrl ||
    result?.url ||
    ''
  );
}

function isFinalStatus(status?: string): boolean {
  const normalized = status?.toLowerCase();
  return !normalized || ['completed', 'succeeded', 'success', 'done'].includes(normalized);
}
