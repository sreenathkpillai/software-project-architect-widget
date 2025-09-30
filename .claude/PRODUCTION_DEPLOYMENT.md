# Production Deployment Guide - ChainCatalyst Workflow

This document provides comprehensive guidance for deploying the Workflow management system to production.

## Architecture Overview

The ChainCatalyst Workflow system consists of:
- **Next.js Application**: React frontend + API routes
- **PostgreSQL Database**: Data persistence via Prisma ORM
- **External Integrations**: OAuth providers, Git services, CI/CD systems
- **AI Services**: OpenAI/Anthropic/Local model integrations

## Prerequisites

### Environment Requirements
- **Node.js**: 18.17+ or 20.0+
- **PostgreSQL**: 13+ (or compatible cloud database)
- **Redis**: 6+ (for caching and rate limiting)
- **SSL Certificate**: Required for OAuth redirects

### External Service Accounts
- **GitHub/GitLab OAuth Apps**: For repository integration
- **AI Provider API Keys**: OpenAI, Anthropic, or local model endpoints
- **Error Tracking**: Sentry or similar (recommended)
- **Monitoring**: DataDog, New Relic, or similar (recommended)

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
DIRECT_URL="postgresql://user:password@host:port/database?schema=public"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://your-domain.com"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
LOCAL_MODEL_URL="http://localhost:11434" # Optional

# OAuth Providers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_REDIRECT_URI="https://your-domain.com/api/auth/callback/github"

GITLAB_CLIENT_ID="your-gitlab-client-id"
GITLAB_CLIENT_SECRET="your-gitlab-client-secret"
GITLAB_REDIRECT_URI="https://your-domain.com/api/auth/callback/gitlab"

BITBUCKET_CLIENT_ID="your-bitbucket-client-id"
BITBUCKET_CLIENT_SECRET="your-bitbucket-client-secret"
BITBUCKET_REDIRECT_URI="https://your-domain.com/api/auth/callback/bitbucket"

# Redis (Optional - for caching)
REDIS_URL="redis://username:password@host:port"

# Error Tracking (Optional)
SENTRY_DSN="https://your-sentry-dsn"

# Monitoring (Optional)
DATADOG_API_KEY="your-datadog-api-key"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"
WEBHOOK_SECRET="your-webhook-secret"

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="60000"
```

### Optional Environment Variables

```bash
# Feature Flags
ENABLE_AI_IMPLEMENTATION="false" # Premium feature
ENABLE_TEAM_COLLABORATION="true"
ENABLE_ISSUE_TRACKER_SYNC="true"
ENABLE_CICD_INTEGRATION="true"

# Performance
MAX_REQUEST_SIZE="10mb"
API_TIMEOUT_MS="30000"
DATABASE_POOL_SIZE="20"

# Logging
LOG_LEVEL="info" # debug, info, warn, error
ENABLE_REQUEST_LOGGING="true"
ENABLE_PERFORMANCE_MONITORING="true"
```

## Database Setup

### 1. Create Database

```sql
-- Create database
CREATE DATABASE chaincatalyst_workflow;

-- Create user (if needed)
CREATE USER workflow_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE chaincatalyst_workflow TO workflow_user;
```

### 2. Run Migrations

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

### 3. Database Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/workflow_backup_$DATE.sql

# Keep only last 30 days
find backups/ -name "workflow_backup_*.sql" -mtime +30 -delete
```

## Deployment Options

### Option 1: Vercel (Recommended for Serverless)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

**vercel.json Configuration:**
```json
{
  "version": 2,
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/widget/:path*",
      "destination": "/widget/:path*"
    }
  ]
}
```

### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/workflow
      - NEXTAUTH_SECRET=your-secret
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: workflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Option 3: AWS/GCP/Azure

**Infrastructure Requirements:**
- **Compute**: Container service (ECS, Cloud Run, Container Apps)
- **Database**: Managed PostgreSQL (RDS, Cloud SQL, Azure Database)
- **Storage**: Object storage for file uploads (S3, Cloud Storage, Blob Storage)
- **CDN**: CloudFront, Cloud CDN, Azure CDN
- **Load Balancer**: Application Load Balancer
- **Monitoring**: CloudWatch, Stackdriver, Azure Monitor

## Security Configuration

### 1. SSL/TLS Setup

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Rate Limiting

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { globalRateLimiter } from '@/lib/error-handling';

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  if (!globalRateLimiter.check(ip)) {
    return new NextResponse('Rate limit exceeded', { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### 3. Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "font-src 'self'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## Monitoring and Observability

### 1. Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check external services
    const checks = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
    };

    return NextResponse.json(checks);
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed', details: error.message },
      { status: 503 }
    );
  }
}
```

### 2. Logging Configuration

```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chaincatalyst-workflow' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
```

### 3. Performance Monitoring

```typescript
// lib/monitoring.ts
import { performanceMonitor } from '@/lib/performance';

// Send metrics to monitoring service
setInterval(() => {
  const summary = performanceMonitor.getPerformanceSummary();

  // Send to DataDog, New Relic, etc.
  sendMetrics({
    'workflow.api.response_time': summary.averageAPITime,
    'workflow.web_vitals.lcp': summary.webVitals.LCP?.value,
    'workflow.web_vitals.fid': summary.webVitals.FID?.value,
    'workflow.web_vitals.cls': summary.webVitals.CLS?.value,
  });
}, 60000); // Every minute
```

## Backup and Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup.sh

# Environment variables
BACKUP_DIR="/backups"
DB_URL="$DATABASE_URL"
RETENTION_DAYS=30

# Create backup
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/workflow_$DATE.sql"

pg_dump "$DB_URL" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Upload to cloud storage
aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/database/

# Clean old backups
find "$BACKUP_DIR" -name "workflow_*.sql.gz" -mtime +$RETENTION_DAYS -delete
```

### 2. Disaster Recovery Plan

1. **Database Recovery**:
   ```bash
   # Restore from backup
   gunzip backup_file.sql.gz
   psql $DATABASE_URL < backup_file.sql
   ```

2. **Application Recovery**:
   ```bash
   # Deploy from known good version
   git checkout last-known-good-commit
   vercel --prod
   ```

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_workflow_projects_external_id ON workflow_projects(external_id);
CREATE INDEX CONCURRENTLY idx_user_stories_project_id ON user_stories(project_id);
CREATE INDEX CONCURRENTLY idx_implementations_status ON implementations(status);
CREATE INDEX CONCURRENTLY idx_activity_log_external_id_timestamp ON activity_log(external_id, timestamp);

-- Analyze query performance
ANALYZE;
```

### 2. Caching Strategy

```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCache<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 3. CDN Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.your-domain.com'],
    loader: 'cloudinary', // or 'imgix', 'akamai'
  },

  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: 'https://cdn.your-domain.com/static/:path*',
      },
    ];
  },
};
```

## Scaling Considerations

### Horizontal Scaling
- **Load Balancing**: Use ALB/ELB with health checks
- **Database**: Read replicas for read-heavy workloads
- **Redis**: Cluster mode for high availability
- **File Storage**: S3/Cloud Storage for scalable file handling

### Vertical Scaling
- **Memory**: Increase for larger datasets and caching
- **CPU**: Scale for AI processing and complex queries
- **Storage**: SSD for database performance

### Auto-scaling Configuration

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-app
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: your-registry/workflow:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   ```bash
   # Check connection
   npx prisma db pull

   # Reset database
   npx prisma migrate reset
   ```

2. **OAuth Redirect Issues**:
   - Verify redirect URIs match exactly
   - Check SSL certificate validity
   - Ensure proper CORS configuration

3. **API Rate Limiting**:
   - Monitor rate limit metrics
   - Implement exponential backoff
   - Cache frequent requests

### Monitoring Commands

```bash
# Check application logs
docker logs -f container_name

# Monitor database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Check memory usage
free -m

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/api/health"
```

This production deployment guide provides comprehensive coverage for deploying the ChainCatalyst Workflow system securely and reliably at scale.