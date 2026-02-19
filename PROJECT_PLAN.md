# Personal Music Infrastructure Plan

## Overview

A self-hosted music streaming solution that provides unified access to a personal music collection across all devices, with a focus on preserving access to music that isn't available on commercial streaming services.

---

## Motivation

### The Problem

Commercial streaming services (Spotify, Apple Music, etc.) control what music is available. They can:

- Remove albums without notice
- Never include certain releases (rare vinyl, regional editions, live recordings)
- Lock users into their ecosystem with no real integration options

### The Goal

Recreate the **ownership and control** of physical media (vinyl, CD, cassette) in the digital realm:

- Play **any** music from a phone, regardless of source
- Access digitized vinyl that doesn't exist anywhere else
- Combine purchased music (Bandcamp) with streaming services
- One unified experience, like a HiFi system with multiple inputs

### What We're Preserving

- Digitized vinyl records (irreplaceable, not on any streaming service)
- Ripped CDs from personal collection
- Bandcamp purchases (owned FLAC files)
- Future: Integration with streaming services that allow it (Tidal, Qobuz)

---

## Constraints

| Constraint                 | Impact                                  |
| -------------------------- | --------------------------------------- |
| iOS mobile (no Android)    | Must use App Store apps; no sideloading |
| No Apple Developer account | Cannot build custom iOS apps            |
| Linux/Mac desktop          | Full flexibility on desktop             |
| Self-hosted preference     | DigitalOcean droplet for server         |
| Budget-conscious           | Avoid expensive subscriptions (no Roon) |

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DigitalOcean Droplet                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Navidrome                            │  │
│  │  • Subsonic-compatible API                                │  │
│  │  • Web UI included                                        │  │
│  │  • Lightweight (single binary)                            │  │
│  │  • Handles: digitized vinyl, Bandcamp, ripped CDs         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Music Storage                          │  │
│  │  /music/                                                  │  │
│  │  ├── Vinyl/                                               │  │
│  │  │   ├── Artist - Album/                                  │  │
│  │  │   │   ├── 01 - Track.flac                              │  │
│  │  │  ...                                                   │  │
│  │  ├── Bandcamp/                                            │  │
│  │  ├── CDs/                                                 │  │
│  │  └── Other/                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (Subsonic API)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    iPhone     │    │  Linux/Mac    │    │  Linux/Mac    │
│               │    │  (Remote)     │    │  (Local)      │
│   Amperfy     │    │               │    │               │
│   (App Store) │    │  Navidrome    │    │    Tuku       │
│               │    │  Web UI       │    │  (Phase 2:    │
│  • Stream     │    │      or       │    │   + Subsonic) │
│  • Offline    │    │  Tuku+Subsonic│    │               │
│  • Background │    │               │    │  • Local files│
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Tech Stack

### Server (Navidrome)

| Component | Technology                    | Notes                               |
| --------- | ----------------------------- | ----------------------------------- |
| Server    | Navidrome                     | Single Go binary, minimal resources |
| Database  | SQLite (embedded)             | No separate DB server needed        |
| API       | Subsonic API                  | Wide client compatibility           |
| Hosting   | DigitalOcean                  | Basic droplet ($6/mo) sufficient    |
| Storage   | Block storage or droplet disk | Depends on collection size          |
| SSL       | Let's Encrypt + Caddy/nginx   | HTTPS required for iOS              |
| Auth      | Built-in user management      | Password protection                 |

### iOS Client (Amperfy)

| Feature             | Support          |
| ------------------- | ---------------- |
| Subsonic/Navidrome  | Yes              |
| Background playback | Yes              |
| Offline downloads   | Yes              |
| CarPlay             | Yes              |
| Cost                | Free (App Store) |
| Open source         | Yes              |

Alternative: **play:Sub** (also free, open source)

### Desktop Client (Tuku)

Current capabilities:

- Local file playback
- SQLite library management
- Metadata extraction (music-metadata)
- Album artwork (iTunes API)
- Queue management with persistence

Phase 2 additions:

- Subsonic API client
- Server mode (stream from Navidrome)
- Unified view (local + remote)

---

## Implementation Phases

### Phase 1: Server Setup (Navidrome on DigitalOcean)

**Goal:** Access digitized vinyl collection from iPhone

#### 1.1 DigitalOcean Setup

```bash
# Create droplet
# - Ubuntu 22.04 LTS
# - Basic ($6/mo): 1 vCPU, 1GB RAM, 25GB disk
# - Or with block storage for larger collections

# SSH into droplet
ssh root@your-droplet-ip
```

#### 1.2 Install Navidrome

```bash
# Create user
sudo useradd -r -s /bin/false navidrome

# Create directories
sudo mkdir -p /opt/navidrome
sudo mkdir -p /var/lib/navidrome
sudo mkdir -p /music

# Download latest release
# Check https://github.com/navidrome/navidrome/releases for current version
wget https://github.com/navidrome/navidrome/releases/download/v0.XX.X/navidrome_0.XX.X_linux_amd64.tar.gz
sudo tar -xvzf navidrome_*.tar.gz -C /opt/navidrome/
sudo chown -R navidrome:navidrome /opt/navidrome /var/lib/navidrome

# Create config
sudo nano /var/lib/navidrome/navidrome.toml
```

Navidrome config (`/var/lib/navidrome/navidrome.toml`):

```toml
MusicFolder = '/music'
DataFolder = '/var/lib/navidrome'
Address = '127.0.0.1'
Port = 4533
AutoImportPlaylists = true
EnableTranscodingConfig = true
DefaultTheme = 'Dark'
```

#### 1.3 Systemd Service

```ini
# /etc/systemd/system/navidrome.service
[Unit]
Description=Navidrome Music Server
After=network.target

[Service]
User=navidrome
Group=navidrome
Type=simple
ExecStart=/opt/navidrome/navidrome --configfile /var/lib/navidrome/navidrome.toml
WorkingDirectory=/var/lib/navidrome
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable navidrome
sudo systemctl start navidrome
```

#### 1.4 Reverse Proxy with Caddy (HTTPS)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Caddyfile (`/etc/caddy/Caddyfile`):

```
music.yourdomain.com {
    reverse_proxy 127.0.0.1:4533
}
```

```bash
sudo systemctl restart caddy
```

#### 1.5 Upload Music

Options:

- **rsync**: `rsync -avz --progress /local/music/ root@server:/music/`
- **SFTP**: Use Filezilla or similar
- **rclone**: For large collections with resume support

Folder structure recommendation:

```
/music/
├── Vinyl/
│   └── Artist - Album (Year)/
│       ├── 01 - Track Name.flac
│       └── cover.jpg
├── Bandcamp/
│   └── Artist - Album/
├── CDs/
└── Other/
```

#### 1.6 iOS Setup

1. Install **Amperfy** from App Store
2. Add server:
   - URL: `https://music.yourdomain.com`
   - Username: (created in Navidrome web UI)
   - Password: (created in Navidrome web UI)
3. Browse library, enable offline downloads for favorites

#### Phase 1 Deliverables

- [ ] DigitalOcean droplet running
- [ ] Navidrome installed and configured
- [ ] HTTPS enabled with valid certificate
- [ ] Music uploaded and scanned
- [ ] Amperfy connected on iPhone
- [ ] Test: play digitized vinyl from phone

---

### Phase 2: Tuku Subsonic Integration

**Goal:** Use Tuku as unified desktop client (local + server)

#### 2.1 Subsonic API Client Module

Create new module: `src/renderer/services/subsonic.ts`

```typescript
interface SubsonicConfig {
	serverUrl: string
	username: string
	password: string // or token
}

interface SubsonicClient {
	ping(): Promise<boolean>
	getArtists(): Promise<Artist[]>
	getAlbums(): Promise<Album[]>
	getSongs(albumId: string): Promise<Song[]>
	getStreamUrl(songId: string): string
	getCoverArt(id: string, size?: number): string
	search(query: string): Promise<SearchResult>
}
```

Subsonic API uses simple REST with query parameters:

```
GET /rest/ping?u=user&p=pass&v=1.16.1&c=tuku&f=json
GET /rest/getAlbumList2?type=newest&u=user&p=pass&v=1.16.1&c=tuku&f=json
GET /rest/stream?id=songId&u=user&p=pass&v=1.16.1&c=tuku
```

#### 2.2 Settings Store Extension

Extend `useSettingsStore` for server configuration:

```typescript
interface SettingsState {
	// ... existing settings

	// Server mode
	mode: 'local' | 'server'
	serverConfig: {
		url: string
		username: string
		password: string
	} | null
}
```

#### 2.3 Audio Player Adaptation

Current flow (local):

```
File path → Main process reads → Blob URL → <audio> element
```

Server flow:

```
Song ID → Subsonic stream URL → <audio> element (direct HTTP)
```

The HTML `<audio>` element can play HTTP URLs directly, so server mode is simpler.

#### 2.4 UI Changes

- Settings modal: Add server configuration section
- Mode toggle: Local / Server
- Connection status indicator
- Library source indicator

#### 2.5 Unified Mode (Future)

Show both local and server libraries:

- Deduplicate by matching metadata
- Prefer local files when available (lower latency)
- Fall back to server for music not stored locally

#### Phase 2 Deliverables

- [ ] Subsonic API client implemented
- [ ] Server configuration in settings
- [ ] Mode toggle (local/server)
- [ ] Audio playback from server URLs
- [ ] Album artwork from server
- [ ] Search works in server mode
- [ ] Test: play server music from Tuku

---

### Phase 3: Streaming Service Integration (Future)

**Goal:** Add Tidal or Qobuz as additional source

#### Considerations

| Service | API Access | Integration Effort | Notes                        |
| ------- | ---------- | ------------------ | ---------------------------- |
| Tidal   | Available  | Medium             | Requires API key application |
| Qobuz   | Available  | Medium             | Purchase + stream model      |
| Deezer  | Limited    | High               | API restrictions             |

#### Architecture Options

1. **Direct integration in Tuku**: Add Tidal/Qobuz API clients
2. **Proxy through Navidrome**: Some forks support streaming services
3. **Separate client**: Use official apps alongside Tuku

This phase is optional and depends on whether unified desktop experience justifies the effort.

---

## File Organization

### Server Music Structure

```
/music/
├── Vinyl/
│   ├── [Artist] - [Album] ([Year])/
│   │   ├── [##] - [Track].flac
│   │   ├── cover.jpg (or cover.png)
│   │   └── notes.txt (optional: recording info)
│   └── ...
├── Bandcamp/
│   └── [Artist] - [Album]/
│       └── [files as downloaded]
├── CDs/
│   └── [Artist] - [Album]/
└── Compilations/
    └── Various Artists - [Album]/
```

### Metadata Standards

For digitized vinyl, embed metadata using a tool like `kid3` or `picard`:

- Artist
- Album
- Track number
- Title
- Year (original release year)
- Genre
- Album artist (for compilations)
- Cover art (embed in file + folder cover.jpg)

---

## Security Considerations

### Server Hardening

```bash
# Firewall (allow only SSH, HTTP, HTTPS)
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Fail2ban for SSH
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Navidrome Security

- Use strong password for Navidrome user
- HTTPS only (enforced by Caddy)
- Consider: reverse proxy authentication (Authelia, Authentik)
- Regular backups of `/var/lib/navidrome` (database)

---

## Backup Strategy

### What to Back Up

| Data          | Location                                           | Frequency              |
| ------------- | -------------------------------------------------- | ---------------------- |
| Music files   | `/music/`                                          | After adding new music |
| Navidrome DB  | `/var/lib/navidrome/`                              | Weekly                 |
| Server config | `/etc/caddy/`, `/var/lib/navidrome/navidrome.toml` | After changes          |

### Local Backup

Keep original digitized files on local storage (NAS, external drive). The server is a copy for streaming access.

```bash
# Sync server to local backup
rsync -avz --progress root@server:/music/ /local/backup/music/
```

---

## Cost Estimate

| Item                         | Monthly Cost    |
| ---------------------------- | --------------- |
| DigitalOcean droplet (Basic) | $6              |
| Block storage (100GB)        | $10 (if needed) |
| Domain (yearly, amortized)   | ~$1             |
| **Total**                    | **$7-17/month** |

Compare to:

- Roon: $15/month
- Spotify + poor integration: $11/month
- Apple Music + no integration: $11/month

---

## References

- [Navidrome Documentation](https://www.navidrome.org/docs/)
- [Subsonic API Documentation](http://www.subsonic.org/pages/api.jsp)
- [Amperfy iOS App](https://github.com/BLeeEZ/amperfy)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [DigitalOcean Initial Server Setup](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-22-04)

---

## Session Notes

_Use this section to track progress and decisions across sessions._

### Session 1 (2026-02-19)

- Defined problem: access to personal music collection (digitized vinyl, Bandcamp, CDs) from iOS
- Ruled out: custom iOS app (requires developer account), Spotify integration (locked ecosystem)
- Decided: Navidrome for server, Amperfy for iOS client
- Decided: Keep Tuku for desktop, extend with Subsonic support in Phase 2
- Created this planning document

### Next Steps

1. Set up DigitalOcean droplet
2. Install and configure Navidrome
3. Upload test batch of music
4. Configure Amperfy on iPhone
5. Validate end-to-end playback
