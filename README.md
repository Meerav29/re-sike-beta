# Recyclopedia - Smart Trash Scanner

An interactive web app that uses your device's camera and Google's Gemini AI to identify trash items and provide proper disposal guidance, including recycling, composting, and creative reuse suggestions.

## Features

- 📸 Real-time camera scanning with rear camera support
- 🤖 AI-powered trash classification using Gemini 2.0 Flash
- ♻️ Accurate bin classification (Recycling, Landfill, Compost, Special Waste)
- 💡 Creative reuse and alternative disposal suggestions
- 📱 Mobile-first responsive design
- 🔦 Flash/torch support for better scanning in low light
- 🔒 Secure API key handling via serverless functions

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.0 Flash (via @google/genai SDK)
- **Deployment**: Vercel (with serverless functions)

## Prerequisites

- Node.js (v18 or higher recommended)
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
- Vercel account (for deployment)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
GEMINI_API_KEY=your_api_key_here
```

You can use `.env.example` as a template.

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

### 5. Preview Production Build

```bash
npm run preview
```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**

```bash
npm install -g vercel
```

2. **Login to Vercel:**

```bash
vercel login
```

3. **Deploy:**

```bash
vercel
```

For production deployment:

```bash
vercel --prod
```

4. **Set Environment Variables:**

After deployment, add your `GEMINI_API_KEY` via the Vercel dashboard:

- Go to your project settings
- Navigate to "Environment Variables"
- Add `GEMINI_API_KEY` with your API key value
- Redeploy: `vercel --prod`

### Option 2: Deploy via GitHub Integration

1. Push your code to a GitHub repository
2. Import the repository in [Vercel Dashboard](https://vercel.com/new)
3. Configure environment variables:
   - Add `GEMINI_API_KEY` in the environment variables section
4. Click "Deploy"

### Important Notes for Deployment

- ✅ Camera access requires HTTPS (Vercel provides this automatically)
- ✅ Environment variables must be set in Vercel dashboard
- ✅ The API key is secure - it's only exposed to serverless functions, not the client
- ✅ No build configuration needed - Vercel auto-detects Vite

## Project Structure

```
recyclopedia/
├── api/
│   └── classify.ts          # Vercel serverless function for Gemini API
├── components/
│   ├── CameraFeed.tsx       # Camera stream component
│   ├── ResultDisplay.tsx    # Results display with alternatives
│   └── icons/               # SVG icon components
├── services/
│   └── geminiService.ts     # API client for classification
├── App.tsx                  # Main app component
├── index.tsx                # React entry point
├── types.ts                 # TypeScript type definitions
├── index.css                # Tailwind CSS imports
├── vercel.json              # Vercel configuration
└── .env.local               # Local environment variables (not committed)
```

## How It Works

1. **Camera Access**: User grants camera permission and points at a trash item
2. **Image Capture**: App captures a JPEG image from the video stream
3. **Pre-validation**: Gemini checks if the image contains a single, clear item
4. **Classification**: If valid, Gemini classifies the item into the correct bin
5. **Alternatives**: AI provides creative reuse and disposal suggestions
6. **Display**: User sees the bin type, explanation, and alternative disposal ideas

## API Endpoints

### POST /api/classify

Classifies a trash item from an image.

**Request Body:**
```json
{
  "imageData": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "itemName": "Plastic Water Bottle",
  "bin": "RECYCLING",
  "reason": "Clean plastic bottles are widely recyclable.",
  "alternatives": [
    "Reuse as a water bottle with a filter insert",
    "Cut and use as a seedling planter",
    "Create a bird feeder",
    "Use for craft projects"
  ]
}
```

## Security

- API keys are stored server-side in Vercel environment variables
- Client never has access to the Gemini API key
- All API calls go through serverless functions
- No credentials are exposed in the browser bundle

## Browser Support

- Chrome/Edge (recommended for best camera support)
- Safari (iOS/macOS)
- Firefox
- Any modern browser with `getUserMedia` API support

## Troubleshooting

### Camera Not Working
- Ensure you're using HTTPS (required for camera access)
- Check browser permissions for camera access
- Try using the rear camera on mobile devices

### API Errors
- Verify your `GEMINI_API_KEY` is set correctly in Vercel
- Check Vercel function logs for detailed error messages
- Ensure your Gemini API key has proper permissions

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Ensure Node.js version is 18 or higher

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Credits

Built with [Google Gemini AI](https://ai.google.dev/), [React](https://react.dev/), and [Vercel](https://vercel.com/).
