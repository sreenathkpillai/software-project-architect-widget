# Software Project Architect - GPT Embed MVP

This MVP embeds your Software Project Architect GPT into a Next.js website using OpenAI's Responses API.

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Add missing dependencies**:
   ```bash
   npm install tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Visit** http://localhost:3000

## System Prompt Configuration

The GPT's behavior is controlled by the `SYSTEM_PROMPT` in `app/api/chat/route.ts`. To match your original GPT exactly:

1. Copy the system instructions from your ChatGPT Custom GPT
2. Replace the default `SYSTEM_PROMPT` in the code
3. Or set it as an environment variable in `.env.local`

## API Usage

- **Endpoint**: `/api/chat`
- **Method**: POST
- **Body**: `{ messages: [{ role: "user", content: "..." }] }`
- **Response**: `{ text: "AI response", usage: {...} }`

## Key Features

- ✅ Secure API key handling (server-side only)
- ✅ React chat component with loading states
- ✅ Responsive design with Tailwind CSS
- ✅ Message history management
- ✅ Error handling
- ✅ Uses OpenAI Responses API (no Assistant creation needed)

## Customization

- **Styling**: Modify `components/chat.tsx` and Tailwind classes
- **Model**: Change `OPENAI_MODEL` in `.env.local` (default: gpt-5)
- **System prompt**: Update in `app/api/chat/route.ts`
- **UI**: Edit `app/page.tsx` for homepage layout

## Deployment

Deploy to Vercel, Netlify, or any Node.js hosting:

1. Set environment variables in your hosting platform
2. Build: `npm run build`
3. Start: `npm start`

Your GPT is now embedded and ready to use on your website!