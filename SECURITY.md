# Security Policy

## Important: Self-Hosted Software

homeMaker is designed for **self-hosted deployment behind Tailscale**. It is NOT intended for public internet exposure. If you expose it publicly, you accept all associated risks.

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Open a private security advisory on the [GitHub repository](https://github.com/protoLabsAI/homeMaker/security/advisories)
3. Or email: security@protolabs.studio

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (optional)

## Security Architecture

### Encryption

- Secrets vault uses AES-256-GCM encryption at rest
- Master key stored in `HOMEMAKER_VAULT_KEY` environment variable (never in code or config files)
- Decrypted values are never logged

### Network Security

- Designed for Tailscale-only access (no public internet)
- API key authentication on all server endpoints
- Rate limiting on sensitive endpoints (vault reads, sensor reports)

### Data Storage

- All data stored locally in SQLite (no cloud sync)
- Sensitive data encrypted before write
- No telemetry or external data transmission

## Security Best Practices

- Keep Node.js and dependencies up to date
- Use a strong, randomly generated `HOMEMAKER_VAULT_KEY` (`openssl rand -hex 32`)
- Use a strong `AUTOMAKER_API_KEY` for server authentication
- Restrict Tailscale ACLs to trusted household devices
- Review AI agent output before acting on recommendations
