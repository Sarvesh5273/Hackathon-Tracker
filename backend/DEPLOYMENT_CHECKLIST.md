# Deployment & Production Checklist

Complete checklist before deploying to production.

---

## 🔧 Pre-Deployment Setup

- [ ] Python 3.11+ installed
- [ ] Virtual environment created and activated
- [ ] All dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file configured with production credentials
- [ ] Database schema created in Supabase
- [ ] Environment variables are NOT in git (check `.gitignore`)

---

## 🔐 Security Review

- [ ] SUPABASE_SERVICE_KEY never exposed in code
- [ ] GEMINI_API_KEY never exposed in code
- [ ] SUPABASE_ANON_KEY properly configured
- [ ] JWT validation implemented correctly
- [ ] Extension token validation implemented
- [ ] User isolation: all queries include user_id filter
- [ ] Input validation via Pydantic on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] CORS configured for specific origins only
- [ ] HTTPS/TLS in place (reverse proxy)

---

## 📊 Database Validation

- [ ] `hackathons` table created with correct schema
- [ ] `plans` table created with correct schema
- [ ] `user_tokens` table created with correct schema
- [ ] All indexes created for performance
- [ ] Foreign key constraints in place
- [ ] Row-level security (RLS) policies configured (if needed)
- [ ] Automated backups configured
- [ ] Connection pooling configured (Supabase)

---

## 🧪 Testing & Validation

- [ ] Health check endpoint works: `GET /health`
- [ ] Extract endpoint works (no auth): `POST /api/extract`
- [ ] All 6 endpoints tested manually
- [ ] JWT validation tested with invalid token
- [ ] Extension token validation tested
- [ ] CORS headers verified in response
- [ ] Error responses return proper status codes
- [ ] Database connection is stable
- [ ] Gemini API is working
- [ ] Crawl4AI is working (if testing extract)

---

## 📈 Performance & Monitoring

- [ ] Logging configured
- [ ] Error tracking configured (Sentry/similar)
- [ ] Monitoring/APM configured
- [ ] Database query performance reviewed
- [ ] Slow queries identified and optimized
- [ ] Connection limits configured
- [ ] Rate limiting considered/implemented
- [ ] Caching strategy considered for extractions

---

## 🚀 Deployment Methods

### Option 1: Traditional Server
```bash
# Install dependencies
pip install -r requirements.txt

# Run with Gunicorn (production ASGI server)
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

- [ ] Gunicorn installed and configured
- [ ] Proper worker count for CPU cores
- [ ] Reverse proxy (nginx/Apache) configured
- [ ] SSL/TLS certificates installed
- [ ] Service restart on failure configured (systemd/supervisor)

### Option 2: Docker
```bash
docker build -t hackathon-api .
docker run -p 8000:8000 --env-file .env hackathon-api
```

- [ ] Docker installed
- [ ] Dockerfile reviewed (includes chromium for Crawl4AI)
- [ ] Docker image tested locally
- [ ] .dockerignore configured
- [ ] Container registry (Docker Hub/ECR) set up
- [ ] Container orchestration ready (Docker Compose/K8s)

### Option 3: Cloud Platform
- [ ] Vercel/Netlify/Railway configured
- [ ] Environment variables set in platform
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] Python version set to 3.11

---

## 🌐 Network & CORS

- [ ] Production domain added to CORS allowed origins
- [ ] chrome-extension://* origin verified for extension
- [ ] Localhost origins removed from production
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Security headers configured (HSTS, CSP, etc.)
- [ ] API gateway/load balancer configured

---

## 📝 API Documentation

- [ ] Swagger UI updated with production URL
- [ ] API documentation deployed (public or internal)
- [ ] Example requests updated with production endpoints
- [ ] Rate limit documentation added
- [ ] SLA/uptime guarantees documented
- [ ] Contact info for API support documented

---

## 🔄 Continuous Integration

- [ ] GitHub Actions or CI/CD pipeline configured
- [ ] Syntax checking on commit
- [ ] Tests run on every push
- [ ] Docker build tested on push
- [ ] Automatic deployment on merge to main
- [ ] Deployment notifications configured

---

## 👥 Access Control

- [ ] Admin access to production limited to key personnel
- [ ] SSH keys secured (not in git)
- [ ] Database credentials rotated
- [ ] API keys rotated regularly
- [ ] Access audit log enabled
- [ ] 2FA enabled for critical accounts

---

## 📞 Support & Maintenance

- [ ] Error tracking dashboard accessible
- [ ] Monitoring/uptime dashboard set up
- [ ] Alert notifications configured (Slack/email)
- [ ] Runbook for common issues created
- [ ] Escalation procedures documented
- [ ] On-call rotation established
- [ ] Regular backup restoration tests scheduled

---

## 🔍 Post-Deployment Verification

After deploying:

- [ ] Health check endpoint responds
- [ ] Extract endpoint works and returns results
- [ ] Created hackathon appears in database
- [ ] JWT authentication works
- [ ] Extension token generation works
- [ ] CORS headers present in responses
- [ ] Error handling works properly
- [ ] Logs are being captured
- [ ] Monitoring alerts are working
- [ ] Performance metrics look normal

---

## 🚨 Rollback Plan

- [ ] Previous version tagged in git
- [ ] Database migration rollback procedure documented
- [ ] Rollback can be executed in < 5 minutes
- [ ] Communication plan for rollbacks documented

---

## 📋 Pre-Production Staging

Before production, test in staging:

- [ ] Deploy to staging environment
- [ ] Run smoke tests against staging
- [ ] Load test with expected traffic
- [ ] Security scan with OWASP tools
- [ ] Penetration test (if required)
- [ ] Get stakeholder sign-off

---

## ✅ Final Sign-Off

- [ ] Tech lead approval
- [ ] Security team approval (if required)
- [ ] Product manager approval
- [ ] Deployment scheduled during low-traffic window
- [ ] Status page updated with maintenance window
- [ ] On-call engineer assigned for deployment

---

## 🎉 Launch!

```bash
# Deployment command
make deploy  # or your CI/CD pipeline
```

Monitor:
- Logs in real-time
- Error tracking dashboard
- Performance metrics
- User reports

---

## Post-Launch (First 24 Hours)

- [ ] Monitor error rates (should be < 0.1%)
- [ ] Monitor response times (should be < 200ms)
- [ ] Check database query performance
- [ ] Monitor API rate and traffic patterns
- [ ] Review all logged errors
- [ ] Verify backups are working
- [ ] Confirm monitoring alerts are firing correctly

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check if app is running, review logs |
| Connection timeout | Check database connection, firewall |
| High response times | Check database queries, scaling |
| CORS errors | Verify origin in allowed_origins |
| 401 errors | Check auth token validity |
| Out of memory | Check worker processes, scaling |

