---
tags: [security]
summary: security implementation decisions and patterns
relevantTo: [security]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# security

#### [Gotcha] HA access token stored in GlobalSettings as plaintext instead of encrypted Vault or credentials store (2026-03-15)
- **Situation:** Token needed for HA API calls but no encryption layer readily integrated with GlobalSettings persistence
- **Root cause:** Simpler implementation reusing existing settings persistence. No additional encryption/decryption infrastructure needed.
- **How to avoid:** Faster implementation but token exposed as plaintext if settings file or database is compromised.