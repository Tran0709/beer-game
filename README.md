# The Beer Game (LA4) — Multiplayer Relay Server

This is the piece that turns multiplayer from "same browser, same device" into
"anyone, anywhere, any timezone, with a room code." It's deliberately tiny —
about 70 lines — because it does no game logic at all. It only groups
WebSocket connections by room code and forwards messages between them. All
the actual game rules still run in the browser, exactly like the
same-device version.

## What's in this folder

- `server.js` — the whole server.
- `package.json` — its one dependency (`ws`).

## Run it locally first (optional, but worth doing once)

```
npm install
npm start
```

You should see `The Beer Game (LA4) relay server listening on port 8787`. Visiting
`http://localhost:8787` in a browser shows a basic status page.

## Deploy it for real (free, ~5 minutes) — Render.com

Render's free tier is the simplest path for a small Node server like this.

1. Go to **render.com** and sign up (GitHub login is fastest).
2. Put this folder in a GitHub repo (or use Render's "public Git repository"
   option if you'd rather not create one — you can also just drag these two
   files into a new repo via GitHub's web UI, no git command line needed).
3. In Render: **New +** → **Web Service** → connect that repo.
4. Settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click **Create Web Service**. Render gives you a URL like
   `https://the-beer-game-relay.onrender.com` after the first deploy finishes
   (a minute or two).

That's your server URL. In The Beer Game, when hosting a room, use:
```
wss://the-beer-game-relay.onrender.com
```
(note **wss://**, not **https://** — same domain, different protocol prefix,
required because the game itself may be opened as a local file or over
https, and browsers require a secure WebSocket in that context).

Whoever joins the room enters that same URL in the "Multiplayer server URL"
field on the Join screen, plus the room code. From then on, everyone —
different computers, different networks, different timezones — is in the
same room, in real time.

### One free-tier quirk worth knowing
Render's free web services "sleep" after 15 minutes of no traffic and take
~30-60 seconds to wake back up on the next connection. If a host creates a
room and nobody connects for a while, the very first join might be slow.
Every join after that is instant until it sleeps again. Paid tiers ($7/mo
and up) remove this; not necessary just to try it out.

## Other free options, if you'd rather not use Render
- **Railway.app** — similar flow, also has a free trial tier.
- **Fly.io** — free allowance, slightly more setup (a `fly.toml` file), but
  no sleep/wake delay.
- **Glitch.com** — the most beginner-friendly; you can paste the code directly
  into their web editor with no GitHub or CLI at all.

Any of these work exactly the same way from the game's side: deploy
`server.js`, get back a URL, put `wss://that-url` into the game's server
field.

## Security note, stated plainly
This server has no authentication, no rate limiting, and no validation of
message contents — it trusts whatever the connected game clients send it,
because it isn't supposed to understand any of it. That's fine for a small
group of friends playing together with a shared room code (the same trust
model as the room code itself — whoever has the code can join). It is *not*
hardened for hosting a public, unlisted-code-guessable, adversarial audience.
If you wanted this genuinely public-internet-safe (rate limiting, room-code
entropy tuning, reconnect/session handling), that's real additional work
worth scoping separately — flagging it now rather than after the fact.
