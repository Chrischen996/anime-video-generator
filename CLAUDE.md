# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run dev:legacy` - Start development server without Turbopack (if font loading issues)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

This is a Next.js 15 application with App Router that generates anime-style videos using AI models:

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **AI Services**: Fal.ai Seedance and ByteDance Doubao 1.5 Pro APIs
- **State Management**: React Context + useReducer for API keys and video state
- **Internationalization**: next-intl for English/Chinese support
- **API Routes**: Next.js API routes for video generation and key validation
- **Storage**: Local storage for persistent settings and video history

### Key Directories
- `src/app/api/` - API routes for video generation and validation
- `src/components/` - React components including video generation UI
- `src/lib/` - Utility functions, API clients, and React context
- `src/hooks/` - Custom React hooks for API key and video generation
- `src/types/` - TypeScript type definitions

### Core Components
- `MainApp.tsx` - Main application layout with tab navigation
- `VideoGenerator.tsx` - Text-to-video and image-to-video generation forms
- `VideoPlayer.tsx` - Video playback with download functionality
- `VideoGallery.tsx` - Browse and manage generated videos
- `Settings.tsx` - API key configuration and default settings

### API Integration Architecture

#### Fal.ai Integration (`src/app/api/generate-video/route.ts`)
- Uses `@fal-ai/client` package for direct API calls
- Supports both text-to-video and image-to-video generation
- Automatic polling with progress simulation
- Error handling for rate limits, quotas, and authentication

#### Doubao 1.5 Pro Integration (`src/lib/doubao-client.ts`)
- Custom HTTP client for ByteDance's Ark platform API
- Supports both text-to-video and image-to-video generation
- Task polling with automatic status checking
- Mock client for development without API keys
- API key validation endpoint

#### Agnes AI Video V2.0 Integration (`src/lib/providers/agnes.ts`)
- Direct HTTP client for Agnes API (`https://apihub.agnes-ai.com`)
- **Task Creation**: `POST /v1/videos` with model, prompt, dimensions, frame settings
- **Status Polling**: `GET /agnesapi?video_id=xxx` returns progress (0-100) and video URL
- **Progress Tracking**: Real-time progress updates from Agnes API (no simulation)
- **Frontend Progress**: `/api/agnes-status` endpoint for polling progress from client
- **Key Features**:
  - Parameterized model selection (default: `agnes-video-v2.0`)
  - Support for both text-to-video and image-to-video
  - No timeout limit - polls until `status === 'completed'`
  - Real-time progress display based on API response
- **API Key**: Passed via `x-agnes-api-key` header or `AGNES_API_KEY` env var

### State Management (`src/lib/context.tsx`)
- React Context + useReducer pattern
- Persists settings and videos to localStorage
- Handles API key management, video generation state, and error handling
- Supports multiple AI model configurations

### Development Workflow

1. **API Key Setup**: Configure in `.env.local`:
   - `FAL_API_KEY` - Fal.ai API key
   - `DOUBAO_API_KEY` - ByteDance Doubao API key
   - `AGNES_API_KEY` - Agnes AI API key (optional, can be set in Settings UI)
2. **Development**: Use `npm run dev` (Turbopack) or `npm run dev:legacy` (standard)
3. **Testing**: Mock clients available when no API keys are configured
4. **Linting**: ESLint configured with Next.js core web vitals and TypeScript rules

### API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-video` | POST | Create video generation task (routes to Fal.ai/Doubao/Agnes) |
| `/api/validate-key` | POST | Validate Fal.ai API key |
| `/api/validate-doubao-key` | POST | Validate Doubao API key |
| `/api/validate-agnes-key` | POST | Validate Agnes API key |
| `/api/agnes-status` | POST | Query Agnes video generation progress (for frontend polling) |
| `/api/video-proxy` | GET | Proxy video URLs to avoid CORS issues |

### Security Notes
- API keys are stored in client-side state and localStorage (not committed)
- Environment variables supported via `.env.local`
- Agnes API key can also be passed via `x-agnes-api-key` header from Settings UI
- Input validation on API routes
- CORS protection through video proxy endpoints

### Agnes Integration Implementation Notes

**Request Parameters** (`POST /v1/videos`):
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "user input",
  "width": 1152,
  "height": 768,
  "num_frames": 121,    // duration * 24 + 1
  "frame_rate": 24,
  "image": "optional url for image-to-video"
}
```

**Response Fields**:
- Task Creation: `{ id, video_id, task_id, status: 'queued', progress: 0 }`
- Status Query: `{ id, status: 'in_progress'|'completed'|'failed', progress: 0-100, remixed_from_video_id: 'video_url' }`
- Status Mapping: `queued/processing/in_progress/pending` → `'processing'`, `completed/succeeded` → `'completed'`, `failed/error` → `'failed'`

**Frontend Progress Polling**:
- Route: `/api/agnes-status`
- Interval: 2 seconds
- Returns: `{ status, progress, video_url, error }`
- Stops when: `status === 'completed'`

### Video Generation Flow

#### For Fal.ai and Doubao:
1. Client → API Route → AI Service
2. Task creation with automatic polling
3. Storage in gallery with metadata persistence

#### For Agnes AI (Real-time Progress):
1. User clicks "Generate" → `POST /api/generate-video` with model='agnes'
2. Backend creates task via `POST /v1/videos` → returns `video_id`
3. Backend polls `GET /agnesapi?video_id=xxx` until `status === 'completed'`
4. Frontend simultaneously polls `POST /api/agnes-status` every 2 seconds
5. Frontend displays real-time progress (0% → 100%) from Agnes API response
6. When `status === 'completed'`, returns `remixed_from_video_id` (video URL)
7. Video stored in gallery with metadata

**Key Difference**: Agnes uses real API progress values instead of simulated progress

# important 
always use byterover-retrieve-knowledge tool to get the related context before any tasks 
always use byterover-store-knowledge to store all the critical informations after sucessful tasks