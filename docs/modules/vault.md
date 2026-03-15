# Secrets vault

Store sensitive credentials and secrets with AES-256-GCM encryption. Values are encrypted at rest and never logged.

## Security model

- Encryption: AES-256-GCM
- Key source: `HOMEMAKER_VAULT_KEY` environment variable (64-character hex = 32 bytes)
- Each secret encrypted with a unique random IV
- The master key never touches the database — only encrypted ciphertext and IV are stored
- Decrypted values exist only in process memory during a read operation

Generate a vault key:

```bash
openssl rand -hex 32
```

## Data model

| Field            | Type   | Description                                     |
| ---------------- | ------ | ----------------------------------------------- |
| `id`             | string | UUID                                            |
| `name`           | string | Human-readable label                            |
| `category`       | string | Category (api-key, password, certificate, etc.) |
| `encryptedValue` | string | AES-256-GCM ciphertext (base64)                 |
| `iv`             | string | Initialization vector (base64)                  |
| `notes`          | string | Non-sensitive notes                             |
| `createdAt`      | string | ISO-8601 timestamp                              |
| `updatedAt`      | string | ISO-8601 timestamp                              |

## API reference

### List secrets (metadata only)

```
GET /api/vault
```

Returns all secrets WITHOUT decrypted values — only `id`, `name`, `category`, `notes`, `createdAt`, `updatedAt`.

### Get decrypted secret

```
GET /api/vault/:id/value
```

Returns the decrypted value for a single secret. Requires the vault to be unlocked.

### Create secret

```
POST /api/vault
```

```json
{
  "name": "GitHub Personal Access Token",
  "category": "api-key",
  "value": "ghp_...",
  "notes": "Read-only token for homeMaker GitHub integration"
}
```

The `value` field is encrypted before storage. It is never stored in plaintext.

### Update secret

```
PUT /api/vault/:id
```

### Delete secret

```
DELETE /api/vault/:id
```

## Security rules

- Never log decrypted vault values — only log IDs and metadata
- The `HOMEMAKER_VAULT_KEY` must be set before the server starts. Starting without it disables vault functionality.
- Rotate the key by exporting all values, regenerating `HOMEMAKER_VAULT_KEY`, and re-importing
