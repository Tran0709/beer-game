// ===== The Beer Game (LA4) — Multiplayer Relay Server =====
//
// WHAT THIS IS: a small, "dumb" relay. It knows nothing about the beer game's
// rules, turns, or players — it only groups WebSocket connections by a room
// code and forwards any message a client sends to every OTHER client in that
// same room. That's it. All the actual game logic already lives in the
// client (engine.js), exactly the same as the BroadcastChannel version — this
// server is a drop-in replacement for BroadcastChannel's transport, not a new
// game server. That's deliberate: it keeps this file tiny, auditable, and
// unable to cheat on anyone's behalf even if it wanted to.
//
// PROTOCOL: a client connects to  ws://HOST:PORT?room=ROOMCODE
// Every JSON message it sends after that is broadcast verbatim to every other
// socket currently connected to that same room code. Sender never receives
// its own message back (matches BroadcastChannel's semantics exactly, so the
// client code didn't need to change its message-handling logic at all).

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;

// rooms: Map<roomCode, Set<WebSocket>>
const rooms = new Map();

function getRoomSet(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}

function broadcastToRoom(code, senderWs, data) {
  const set = rooms.get(code);
  if (!set) return;
  const text = data.toString('utf8'); // force a text frame — sending the raw Buffer as-is
                                       // makes browsers deliver it as a Blob, not a string,
                                       // which silently broke client-side JSON.parse(e.data)
  for (const client of set) {
    if (client !== senderWs && client.readyState === client.OPEN) {
      client.send(text);
    }
  }
}

// plain HTTP server underneath — gives us a health-check endpoint at "/"
// (useful for free hosting platforms that ping a URL to keep the service
// awake, and for you to sanity-check the server is actually running)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  const roomSummary = Array.from(rooms.entries()).map(([code, set]) => `${code}: ${set.size} connected`).join('\n');
  res.end('The Beer Game (LA4) relay server is running.\n\nActive rooms:\n' + (roomSummary || '(none)'));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const room = (url.searchParams.get('room') || '').trim().toUpperCase();
  if (!room) {
    ws.close(4000, 'No room code provided');
    return;
  }
  const set = getRoomSet(room);
  set.add(ws);
  console.log(`[connect] room=${room} nowConnected=${set.size}`);

  ws.on('message', (data) => {
    broadcastToRoom(room, ws, data);
  });

  ws.on('close', () => {
    set.delete(ws);
    console.log(`[disconnect] room=${room} nowConnected=${set.size}`);
    if (set.size === 0) rooms.delete(room);
  });

  ws.on('error', (err) => {
    console.error(`[error] room=${room}:`, err.message);
  });
});

server.listen(PORT, () => {
  console.log(`The Beer Game (LA4) relay server listening on port ${PORT}`);
});
