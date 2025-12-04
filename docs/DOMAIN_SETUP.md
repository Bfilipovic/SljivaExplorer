# Setting Up Explorer Domain

This guide explains how to configure the explorer to work with a custom domain (e.g., `nft.nomin.foundation`).

## Prerequisites

1. DNS record pointing your domain to your server IP
2. Nginx installed on your server
3. Explorer running on port 4175

## DNS Configuration

First, ensure your DNS is configured correctly:

```
Type: A
Name: nft (or @ for root domain)
Value: 161.97.146.46
TTL: 3600 (or default)
```

## Nginx Configuration

### Option 1: Add to Existing Nginx Configuration

If you already have nginx running, add the explorer server block to your existing configuration:

```nginx
# Explorer server block
server {
    listen 80;
    server_name nft.nomin.foundation;

    # Explorer API routes
    location /api/explorer {
        proxy_pass http://localhost:4175;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files and SPA routes
    location / {
        proxy_pass http://localhost:4175;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Separate Configuration File

1. Copy the example configuration:
   ```bash
   cp explorer-nginx.conf /etc/nginx/sites-available/nft.nomin.foundation
   ```

2. Edit the file to match your setup:
   ```bash
   sudo nano /etc/nginx/sites-available/nft.nomin.foundation
   ```

3. Create symbolic link to enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/nft.nomin.foundation /etc/nginx/sites-enabled/
   ```

4. Test nginx configuration:
   ```bash
   sudo nginx -t
   ```

5. Reload nginx:
   ```bash
   sudo systemctl reload nginx
   ```

## Verifying Setup

1. Check DNS resolution:
   ```bash
   dig nft.nomin.foundation
   # or
   nslookup nft.nomin.foundation
   ```

2. Test from browser:
   - Open `http://nft.nomin.foundation`
   - Should see the explorer interface

3. Test API endpoint:
   ```bash
   curl http://nft.nomin.foundation/api/explorer/stores
   ```

## HTTPS Setup (Recommended)

For production, you should set up HTTPS using Let's Encrypt:

1. Install Certbot:
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   ```

2. Get SSL certificate:
   ```bash
   sudo certbot --nginx -d nft.nomin.foundation
   ```

3. Certbot will automatically update your nginx configuration and set up automatic renewal.

After HTTPS is set up, you can:
- Use `crypto.subtle` for transaction verification (requires secure context)
- Improve security and SEO

## Troubleshooting

### Domain doesn't resolve

- Check DNS records: `dig nft.nomin.foundation`
- Verify DNS propagation: https://www.whatsmydns.net/
- Check firewall rules on port 80/443

### 502 Bad Gateway

- Verify explorer is running: `curl http://localhost:4175/health`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify port 4175 is accessible internally

### CORS Errors

The explorer server should accept requests from any origin in production. If you see CORS errors:
- Check that the explorer server is running in production mode
- Verify nginx is passing the correct headers

### Explorer shows but API doesn't work

- Check nginx configuration for `/api/explorer` location block
- Verify proxy_pass points to `http://localhost:4175`
- Check explorer server logs for errors

## Multiple Domains

If you want to serve both the store and explorer from the same server:

```nginx
# Store domain
server {
    listen 80;
    server_name kodak.beogradfilm.com;
    # ... store configuration
}

# Explorer domain
server {
    listen 80;
    server_name nft.nomin.foundation;
    # ... explorer configuration (from above)
}
```

