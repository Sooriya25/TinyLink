# TinyLink - URL Shortener

A simple and efficient URL shortener service built with Node.js and Express, following the assignment specifications.

## Features

- ✅ **Create short links** - Convert long URLs into short, shareable links with optional custom codes
- ✅ **Redirect** - HTTP 302 redirects to original URLs with click tracking
- ✅ **Click tracking** - Track total clicks and last clicked time
- ✅ **Dashboard** - Web interface for managing all links
- ✅ **Stats page** - Individual link statistics
- ✅ **REST API** - Complete API following specification
- ✅ **PostgreSQL storage** - Persistent database storage
- ✅ **Health endpoint** - Service health monitoring
- ✅ **Responsive design** - Mobile-friendly interface

## Quick Start

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL
   ```

3. **Run the application:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

## API Endpoints

### Core API Routes (as per specification)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/links` | Create link (409 if code exists) |
| `GET` | `/api/links` | List all links |
| `GET` | `/api/links/:code` | Stats for one code |
| `DELETE` | `/api/links/:code` | Delete link |

### Page Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard (list, add, delete) |
| `/code/:code` | Stats for a single code |
| `/:code` | Redirect (302 or 404) |
| `/healthz` | Health check |

## API Usage Examples

### Create a link
```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "code": "docs"}'
```

### Get all links
```bash
curl http://localhost:3000/api/links
```

### Get link stats
```bash
curl http://localhost:3000/api/links/docs
```

### Delete a link
```bash
curl -X DELETE http://localhost:3000/api/links/docs
```

### Health check
```bash
curl http://localhost:3000/healthz
```

## Database Schema

```sql
CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) UNIQUE NOT NULL,
  url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_clicked TIMESTAMP
);
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Deployment

### Recommended Stack
- **Frontend/Backend**: Render or Railway
- **Database**: Neon Postgres (free tier)

### Deploy to Render
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with build command: `npm install`
4. Start command: `npm start`

### Deploy to Railway
1. Connect GitHub repository
2. Add PostgreSQL plugin
3. Set DATABASE_URL environment variable
4. Deploy automatically

## Code Validation

- Short codes follow pattern: `[A-Za-z0-9]{6,8}`
- URLs are validated before saving
- Duplicate codes return 409 status
- Deleted links return 404 on redirect

## Features Implementation

### Dashboard (/)
- Table of all links with sorting
- Add new links with optional custom codes
- Delete existing links
- Copy short links to clipboard
- Responsive design

### Stats Page (/code/:code)
- Individual link statistics
- Click count and timestamps
- Quick actions (copy, visit)

### Redirect (/:code)
- HTTP 302 redirect to target URL
- Increments click counter
- Updates last clicked timestamp
- Returns 404 for non-existent codes

### Health Check (/healthz)
- Returns `{"ok": true, "version": "1.0"}`
- Always returns 200 status

## Testing

The application follows the exact specification for automated testing:

1. Health endpoint returns 200
2. Creating links works, duplicates return 409
3. Redirects work and increment click count
4. Deletion stops redirects (404)
5. UI meets all requirements
