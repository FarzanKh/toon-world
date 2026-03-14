/**
 * server.js — Toon World 3D backend
 *
 * Uses the official @google/genai SDK (Google's unified GenAI SDK for 2025).
 * Runs on Google Cloud Run with Vertex AI for Gemini access.
 *
 * SDK docs: https://googleapis.github.io/js-genai/
 * Vertex AI: https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview
 *
 * Authentication:
 *   - Cloud Run: automatic via service account (ADC)
 *   - Local dev: run `gcloud auth application-default login` first
 *
 * Environment variables:
 *   GOOGLE_CLOUD_PROJECT   — GCP project ID (required)
 *   GOOGLE_CLOUD_LOCATION  — Vertex AI location (default: global)
 *   PORT                   — server port (default: 8080)
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

// ── @google/genai SDK ─────────────────────────────────────────────────────────
const { GoogleGenAI, Modality } = require('@google/genai');

const PORT     = process.env.PORT                 || 8080;
const PROJECT  = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const MODEL    = 'gemini-2.5-flash-image';

if (!PROJECT) {
  console.error('ERROR: GOOGLE_CLOUD_PROJECT environment variable is not set.');
  process.exit(1);
}

// Initialise the SDK for Vertex AI.
// When vertexai:true, the SDK uses Application Default Credentials (ADC)
// automatically — no manual token fetching or API keys needed.
const ai = new GoogleGenAI({
  vertexai: true,
  project:  PROJECT,
  location: LOCATION,
});

console.log('');
console.log('  ✨ Toon World 3D');
console.log(`  🌐 Server starting on port ${PORT}`);
console.log(`  ☁️  GCP project : ${PROJECT}`);
console.log(`  📍 Location    : ${LOCATION}`);
console.log(`  🤖 Model       : ${MODEL} via @google/genai SDK + Vertex AI`);
console.log('');

// ── Gemini streaming handler ──────────────────────────────────────────────────
//
// Called for POST /api/stream
// Reads the prompt from the request body, calls Gemini via the SDK using
// generateContentStream with responseModalities: [TEXT, IMAGE], then
// streams each chunk back to the browser as Server-Sent Events (SSE).
// The React frontend reads this SSE stream and renders blocks as they arrive.

async function handleStream(req, res) {
  // Read request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, corsJson());
      res.end(JSON.stringify({ error: { message: 'Invalid JSON in request body' } }));
      return;
    }

    // Extract the prompt text from the request
    const promptText = parsed?.contents?.[0]?.parts?.[0]?.text;
    if (!promptText) {
      res.writeHead(400, corsJson());
      res.end(JSON.stringify({ error: { message: 'No prompt text found in request body' } }));
      return;
    }

    // Open SSE stream to client
    res.writeHead(200, {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache',
      'Connection':                  'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    try {
      console.log(`[SDK] Starting stream — model: ${MODEL}, location: ${LOCATION}`);

      // ── The core SDK call ──────────────────────────────────────────────────
      // generateContentStream with TEXT + IMAGE modalities is the key feature:
      // Gemini generates text and images interleaved in a single coherent stream.
      const stream = await ai.models.generateContentStream({
        model:    MODEL,
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      let blockCount = 0;

      // Iterate over chunks as they stream from Gemini
      for await (const chunk of stream) {
        const parts = chunk?.candidates?.[0]?.content?.parts ?? [];

        for (const part of parts) {
          if (part.text || part.inlineData) {
            blockCount++;
            // Send each part as an SSE event — client parses these immediately
            const sseData = JSON.stringify({ candidates: [{ content: { parts: [part] } }] });
            res.write(`data: ${sseData}\n\n`);
          }
        }

        // Surface any finish reason errors to the client
        const finishReason = chunk?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
          console.warn(`[SDK] Finish reason: ${finishReason}`);
          const errData = JSON.stringify({ error: { message: `Generation stopped: ${finishReason}` } });
          res.write(`data: ${errData}\n\n`);
          break;
        }
      }

      console.log(`[SDK] Stream complete — ${blockCount} parts sent`);
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (err) {
      console.error('[SDK] Stream error:', err.message);
      const errData = JSON.stringify({ error: { message: err.message } });
      res.write(`data: ${errData}\n\n`);
      res.end();
    }
  });
}

// ── Static file server ────────────────────────────────────────────────────────

const MIME = {
  '.html':  'text/html',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff2': 'font/woff2',
};

const PUBLIC_DIR = path.join(__dirname, 'public');

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ── CORS headers helper ───────────────────────────────────────────────────────

function corsJson() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  };
}

// ── Main server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Primary streaming endpoint — used by the React app
  if (req.method === 'POST' && pathname === '/api/stream') {
    handleStream(req, res);
    return;
  }

  // Static files + SPA fallback
  if (req.method === 'GET') {
    const filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    serveStatic(res, filePath);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`  ✅ Ready at http://localhost:${PORT}`);
  console.log('');
});
