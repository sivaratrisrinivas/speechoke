# Speechoke

Practice famous speeches. Get instant feedback.

## Demo

<video src="assets/speechoke.mp4" controls width="100%"></video>

## What it is

Speechoke is a speech karaoke app. You pick a famous speech (or write your own), read it from a scrolling teleprompter while it records you, then get scores and feedback from an AI coach on clarity, emotion, and pacing.

## Why use it

- **Low pressure** — Practice alone in your browser, no live audience
- **Real feedback** — AI listens to your recording and gives concrete tips
- **Fun speeches** — Pulp Fiction, Blade Runner, Network, Lincoln, Succession, 8 Mile
- **Improve delivery** — Learn to pause, project, and land lines like the pros

## How it works

1. Pick a speech or paste your own text
2. Set your scroll speed and hit Start
3. Read along with the teleprompter while it records
4. Stop when done — the AI analyzes your performance
5. See your scores and a written critique with one tip to improve

## How to run it

You need Node.js installed.

1. Install dependencies: `npm install`
2. Create `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Start the app: `npm run dev`
4. Open http://localhost:3000

## Tech

React, Vite, Google Gemini AI for audio analysis. Uses your microphone for recording.
