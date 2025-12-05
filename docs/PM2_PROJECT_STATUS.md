# PM2 Project Status Report
**Date**: 2025-10-28
**Server**: 141.164.60.51 (Vultr, Ubuntu 22.04)

## ✅ All Projects Running Successfully

### Overview
All 7 PM2-managed projects are operational and externally accessible. Projects have been running for 10+ hours with stable performance.

## Project Details

### 1. codeb-api-server ✅
- **PM2 ID**: 1
- **Port**: 3008
- **PID**: 2048
- **Script**: `/root/codeb-api-server.js`
- **Working Directory**: `/root`
- **Status**: Online (10h uptime)
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK

### 2. codeb-web ✅
- **PM2 ID**: 2
- **Port**: 8095
- **PID**: 2051
- **Script**: `/root/demo`
- **Working Directory**: `/root`
- **Status**: Online (10h uptime)
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK

### 3. starpick ✅
- **PM2 ID**: 3
- **Port**: 3000
- **PID**: 2777 (Next.js server v14.2.31)
- **Parent PID**: 2062 (npm run dev)
- **Working Directory**: `/opt/starpick`
- **Status**: Online (10h uptime)
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK (Next.js headers confirmed)
- **Mode**: Development mode

### 4. starpick-platform ✅
- **PM2 ID**: 4
- **Port**: 3002
- **PID**: 2489 (Next.js server v14.2.31)
- **Working Directory**: Unknown
- **Environment**: PORT=3002
- **Status**: Online (10h uptime)
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK (Next.js headers confirmed)

### 5. misopin-cms ✅ (Cluster Mode)
- **PM2 ID**: 5, 6 (2 instances)
- **Port**: 3001
- **PIDs**: 2066, 2077
- **Script**: `/var/www/misopin-cms/.next/standalone/server.js`
- **Working Directory**: `/var/www/misopin-cms`
- **Status**: Online (10h uptime) - Cluster mode
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK
- **Framework**: Next.js standalone build

### 6. saju-naming ✅
- **PM2 ID**: 7
- **Port**: 3005
- **PID**: 2229
- **Script**: npm start
- **Working Directory**: `/var/www/saju`
- **Environment**: PORT=3005 (.env file)
- **Status**: Online (10h uptime)
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK

### 7. vsvs.kr CMS ✅ (Podman Container)
- **Container**: vsvs_app
- **Port**: 3100 (mapped from container port 3000)
- **Database**: PostgreSQL on 5440
- **Redis**: Standalone on 6390
- **Status**: Online
- **Accessibility**: ✅ Externally accessible
- **Test Result**: HTTP 200 OK
- **Framework**: Remix

## Additional Listening Ports

### saju-naming Alternative Port
- **Port**: 10281
- **PID**: 2429 (node process)
- **Status**: Listening internally
- **Note**: May be development server or alternative endpoint

### PM2 God Daemon
- **Port**: 3001
- **PID**: 1857
- **Purpose**: PM2 process manager daemon

## Infrastructure Services

### Databases
- **PostgreSQL**: Port 5432 (main instance)
- **PostgreSQL**: Port 5436 (warehouse-rental)
- **PostgreSQL**: Port 5440 (vsvs.kr CMS)

### Caching
- **Redis**: Port 6379 (main instance)
- **Redis**: Port 6390 (vsvs.kr CMS)

### Web Server
- **Caddy**: Ports 80, 443, 2019 (admin)

### Other Services
- **PowerDNS**: Ports 53, 8081

## Firewall Configuration

All project ports are properly configured in UFW:
- ✅ 3000/tcp (starpick)
- ✅ 3001/tcp (misopin-cms)
- ✅ 3002/tcp (starpick-platform)
- ✅ 3005/tcp (saju-naming)
- ✅ 3008/tcp (codeb-api-server)
- ✅ 3100/tcp (vsvs.kr CMS)
- ✅ 8095/tcp (codeb-web)

## Known Issues

### warehouse-rental (Port 3010) ⚠️
- **Status**: Container running, app started
- **Issue**: Port 3010 completely inaccessible externally
- **Details**: App listening on 0.0.0.0:3010, firewall rules configured, but no route to host
- **Requires**: Deep networking investigation, possibly Vultr firewall settings

## Summary

- **Total Projects**: 8 (7 PM2 + 1 Podman)
- **Running Successfully**: 7 out of 8
- **Externally Accessible**: 7 out of 8
- **Average Uptime**: 10+ hours
- **System Health**: Stable

## Technology Stack

### Frameworks
- **Next.js**: starpick, starpick-platform, misopin-cms (v14.2.31)
- **Remix**: saju-naming, vsvs.kr CMS
- **Node.js**: codeb-api-server, codeb-web

### Process Management
- **PM2**: 7 projects (fork + cluster modes)
- **Podman**: 1 project (vsvs.kr CMS)

### Architecture
- **PM2 Fork Mode**: codeb-api-server, codeb-web, starpick, starpick-platform, saju-naming
- **PM2 Cluster Mode**: misopin-cms (2 instances)
- **Podman Bridge Networking**: vsvs.kr CMS

## Next Steps

1. ✅ **Complete**: Verify all PM2 projects are running and accessible
2. ⏳ **Pending**: Resolve warehouse-rental port 3010 accessibility issue
3. ⏳ **Pending**: Consider moving management tool from Express to Next.js/Remix
4. ⏳ **Pending**: Document PM2 ecosystem.config.js files
5. ⏳ **Pending**: Set up PM2 auto-restart on boot

---
**Last Updated**: 2025-10-28
**Status**: 7/8 projects fully operational
