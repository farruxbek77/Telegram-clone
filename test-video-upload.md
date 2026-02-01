# Video Upload Test Instructions

## How to Test Video Upload Feature

1. **Open the application**: Go to http://localhost:3001
2. **Login**: Click the "Kirish" (Login) button
3. **Look for the video upload button**: You should see two buttons in the message input area:
   - 📷 Image upload button (existing)
   - 🎥 Video upload button (new)

## Features Implemented

### Backend (server-simple.js):
- ✅ Video file upload endpoint `/api/upload/video`
- ✅ File validation for video types
- ✅ 50MB file size limit for videos
- ✅ Video URL handling in socket messages
- ✅ Support for video messages in both general and private chats

### Frontend (Chat.js):
- ✅ Video file selection with validation
- ✅ Video preview before sending
- ✅ Video upload progress indication
- ✅ Video player in chat messages
- ✅ Video message display with controls

### CSS Styling:
- ✅ Video message styling
- ✅ Video preview container
- ✅ Responsive video display
- ✅ Video controls enhancement
- ✅ Loading states for video upload

## Test Steps:

1. **Select Video**: Click the video upload button (🎥)
2. **Choose File**: Select a video file (MP4, WebM, etc.)
3. **Preview**: You should see a video preview with play controls
4. **Send**: Click the send button to upload and send the video
5. **View**: The video should appear in the chat with playback controls

## Supported Video Formats:
- MP4
- WebM
- AVI
- MOV
- And other common video formats supported by browsers

## File Size Limit:
- Maximum: 50MB per video file
- Images: 5MB limit (unchanged)

The video upload feature is now fully integrated with the existing chat system!