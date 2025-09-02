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

### State Management (`src/lib/context.tsx`)
- React Context + useReducer pattern
- Persists settings and videos to localStorage
- Handles API key management, video generation state, and error handling
- Supports multiple AI model configurations

### Development Workflow

1. **API Key Setup**: Configure FAL_API_KEY and/or DOUBAO_API_KEY in `.env.local`
2. **Development**: Use `npm run dev` (Turbopack) or `npm run dev:legacy` (standard)
3. **Testing**: Mock clients available when no API keys are configured
4. **Linting**: ESLint configured with Next.js core web vitals and TypeScript rules

### Security Notes
- API keys are stored in client-side state and localStorage (not committed)
- Environment variables supported via `.env.local`
- Input validation on API routes
- CORS protection through video proxy endpoints

### Video Generation Flow
1. Client → API Route → AI Service (Fal.ai/Doubao)
2. Task creation with automatic polling
3. Progress simulation during generation
4. Video URL proxying to avoid CORS issues
5. Storage in gallery with metadata persistence[byterover-mcp]

# important 
always use byterover-retrieve-knowledge tool to get the related context before any tasks 
always use byterover-store-knowledge to store all the critical informations after sucessful tasks