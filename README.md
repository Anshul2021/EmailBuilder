# AI Email Builder

A professional AI-powered email template builder built with Next.js 14, MJML, and Google Gemini API.

## Features
- **AI Generation**: Generate beautiful email templates using natural language prompts.
- **Live Preview**: Real-time rendering of compiled HTML using MJML.
- **Responsive Design**: Toggle between Desktop and Mobile views.
- **Credit System**: Visual AI credit tracking for usage monitoring.
- **Modern UI**: Clean, responsive interface with premium aesthetics.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **AI Model**: Google Gemini 2.5 Flash
- **Engine**: MJML (Mailjet Markup Language)
- **Styling**: Vanilla CSS + Tailwind
- **Animations**: Framer Motion

## Getting Started

### Prerequisites
- Node.js 18+
- Google AI Studio API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Gyan-Seedicon/Email-Builder-AI.git
   cd ai-email-builder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage
- Enter a prompt like "Create a minimalist password reset email" in the sidebar.
- Click **Generate Template**.
- Preview the result in the right pane.
- Use **Copy MJML** or **Export HTML** to use the generated code.

## License
MIT
