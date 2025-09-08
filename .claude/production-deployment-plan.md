# Production Deployment Plan - Software Project Architect

## Overview
This document outlines the complete deployment strategy for deploying the Software Project Architect application to AWS EC2 in production.

## Architecture Overview

### Components
- **Frontend**: Next.js application (React)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: Local filesystem (consider S3 for production)
- **Authentication**: JWT-based with iframe embedding support

### Deployment Architecture
```
[Route 53] → [CloudFront CDN] → [ALB] → [EC2 Instance(s)] → [RDS PostgreSQL]
                                    ↓
                              [Auto Scaling Group]
```

## Pre-Deployment Requirements

### 1. AWS Account Setup
- [ ] AWS account with appropriate IAM permissions
- [ ] AWS CLI configured locally
- [ ] EC2 key pair created for SSH access
- [ ] VPC and subnets configured (or use default)

### 2. Domain & SSL
- [ ] Domain name registered
- [ ] SSL certificate via AWS Certificate Manager
- [ ] Route 53 hosted zone configured

### 3. Database Setup
- [ ] RDS PostgreSQL instance (version 13+)
- [ ] Database security group configured
- [ ] Connection string and credentials secured

## EC2 Instance Configuration

### Instance Specifications
```yaml
Instance Type: t3.medium (minimum)
  - 2 vCPUs
  - 4 GB RAM
  - 20 GB SSD (gp3)
  
Operating System: Ubuntu 22.04 LTS
Security Group:
  - Inbound: 
    - HTTP (80) from ALB
    - HTTPS (443) from ALB
    - SSH (22) from your IP
  - Outbound: All traffic
```

### Initial Setup Script
```bash
#!/bin/bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx
sudo apt-get install -y nginx

# Install git
sudo apt-get install -y git

# Create app directory
sudo mkdir -p /var/www/software-architect
sudo chown -R ubuntu:ubuntu /var/www/software-architect
```

## Application Deployment

### 1. Environment Configuration
Create `.env.production`:
```env
# Database
DATABASE_URL="postgresql://username:password@rds-endpoint:5432/dbname?schema=public"

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=3000

# Security
JWT_SECRET=your-secure-jwt-secret-min-32-chars
NEXTAUTH_SECRET=your-secure-nextauth-secret

# Parent App Integration
ALLOWED_ORIGINS=https://parent-app.com,https://another-parent.com
PARENT_AUTH_ENDPOINT=https://parent-app.com/api/verify-token

# AWS (if using S3 for file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=software-architect-docs
```

### 2. Deployment Steps
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@ec2-instance-ip

# Clone repository
cd /var/www/software-architect
git clone https://github.com/your-repo/software-architect.git .

# Install dependencies
npm ci --production

# Run database migrations
npx prisma migrate deploy

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'software-architect',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/error.log',
    out_file: '/var/log/pm2/out.log',
    log_file: '/var/log/pm2/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

## Nginx Configuration

### Reverse Proxy Setup
```nginx
# /etc/nginx/sites-available/software-architect
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "ALLOWALL";  # Required for iframe embedding
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "frame-ancestors *;";  # Allow all origins for embedding

    # Proxy Settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running AI requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Static file caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

## Database Setup

### PostgreSQL on RDS
```sql
-- Create database
CREATE DATABASE software_architect;

-- Create user
CREATE USER app_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE software_architect TO app_user;

-- Run Prisma migrations (from application)
-- npx prisma migrate deploy
```

### Backup Strategy
- Enable automated RDS backups (7-day retention)
- Weekly manual snapshots
- Cross-region backup replication for disaster recovery

## Security Hardening

### 1. Application Security
- [ ] Enable rate limiting on API endpoints
- [ ] Implement request validation and sanitization
- [ ] Set up CORS properly for iframe embedding
- [ ] Secure session management
- [ ] Input validation for all user inputs

### 2. Infrastructure Security
- [ ] Configure AWS Security Groups restrictively
- [ ] Enable AWS CloudTrail for audit logging
- [ ] Set up AWS GuardDuty for threat detection
- [ ] Configure fail2ban for SSH protection
- [ ] Regular security updates via unattended-upgrades

### 3. SSL/TLS Configuration
```bash
# Install Certbot for Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Monitoring & Logging

### 1. Application Monitoring
```bash
# Install monitoring stack
# CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 2. Log Management
```yaml
Logs to collect:
  - Application logs: /var/log/pm2/*.log
  - Nginx access logs: /var/log/nginx/access.log
  - Nginx error logs: /var/log/nginx/error.log
  - System logs: /var/log/syslog
```

### 3. Health Checks
```javascript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

## Auto-Scaling Configuration

### Auto Scaling Group
```yaml
Launch Template:
  - AMI: Custom AMI with app pre-installed
  - Instance Type: t3.medium
  - User Data: Startup script

Auto Scaling Policy:
  - Minimum: 1 instance
  - Desired: 2 instances
  - Maximum: 5 instances
  
Scaling Triggers:
  - CPU > 70% for 5 minutes: Add 1 instance
  - CPU < 30% for 10 minutes: Remove 1 instance
  - Target tracking: 50% CPU utilization
```

## Deployment Automation

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/software-architect
            git pull origin main
            npm ci --production
            npx prisma migrate deploy
            npm run build
            pm2 reload software-architect
```

## Performance Optimization

### 1. Application Level
- [ ] Enable Next.js production optimizations
- [ ] Implement API response caching
- [ ] Optimize database queries with indexes
- [ ] Use connection pooling for database
- [ ] Implement lazy loading for components

### 2. Infrastructure Level
- [ ] CloudFront CDN for static assets
- [ ] Redis/ElastiCache for session storage
- [ ] Database read replicas for scaling
- [ ] Load balancer with sticky sessions

### 3. Caching Strategy
```nginx
# Static assets caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Disaster Recovery

### Backup Plan
1. **Database**: Daily automated backups, 30-day retention
2. **Application Code**: Git repository + tagged releases
3. **Configuration**: Stored in AWS Secrets Manager
4. **User Documents**: S3 with versioning enabled

### Recovery Procedures
1. **Database Failure**: Restore from latest RDS snapshot
2. **Instance Failure**: Auto Scaling Group launches replacement
3. **Region Failure**: Failover to DR region (if configured)

## Cost Optimization

### Estimated Monthly Costs (AWS)
```
EC2 t3.medium (2 instances): $60
RDS db.t3.micro: $25
Load Balancer: $20
Data Transfer: $10
S3 Storage: $5
CloudWatch: $5
Route 53: $1
-------------------
Total: ~$126/month
```

### Cost Saving Measures
- Use Reserved Instances for 30-70% savings
- Implement auto-scaling to reduce idle capacity
- Use S3 Intelligent-Tiering for documents
- Enable CloudFront compression

## Maintenance Plan

### Regular Tasks
- **Daily**: Monitor logs and alerts
- **Weekly**: Security updates check
- **Monthly**: Performance review, cost optimization
- **Quarterly**: Disaster recovery drill

### Update Procedure
1. Test updates in staging environment
2. Create database backup
3. Deploy during low-traffic window
4. Monitor for issues
5. Rollback plan ready

## Rollback Strategy

### Quick Rollback
```bash
# Using PM2
pm2 reload software-architect --update-env

# Using Git
git checkout previous-version-tag
npm ci --production
npm run build
pm2 reload software-architect
```

### Database Rollback
```bash
# Restore from snapshot
npx prisma migrate resolve --rolled-back
```

## Support & Documentation

### Key Contacts
- DevOps Lead: [Contact Info]
- Database Admin: [Contact Info]
- Security Team: [Contact Info]

### Documentation
- API Documentation: `/docs/api`
- Deployment Runbook: This document
- Troubleshooting Guide: `/docs/troubleshooting`

## Compliance & Legal

### GDPR Compliance
- [ ] Data processing agreements in place
- [ ] Privacy policy updated
- [ ] User consent mechanisms
- [ ] Data deletion procedures

### Security Compliance
- [ ] SOC 2 requirements met
- [ ] Regular penetration testing
- [ ] Vulnerability scanning
- [ ] Security incident response plan

## Launch Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backups tested
- [ ] Load testing completed
- [ ] Security scan passed

### Launch Day
- [ ] Deploy application
- [ ] Verify health checks
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics

### Post-Launch
- [ ] Monitor for 24 hours
- [ ] Address any critical issues
- [ ] Document lessons learned
- [ ] Plan optimizations

---

## Notes
- This plan assumes a single-region deployment. For multi-region, additional configuration needed.
- Consider using AWS Elastic Beanstalk or ECS for easier management at scale.
- For high availability, implement multi-AZ deployment with RDS Multi-AZ.