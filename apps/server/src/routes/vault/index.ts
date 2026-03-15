/**
 * Vault API Routes
 *
 * - POST   /api/vault          — Create a new vault entry
 * - GET    /api/vault          — List all vault entries (metadata only, no values)
 * - GET    /api/vault/search   — Search vault entries by name, tags, username, url
 * - GET    /api/vault/:id      — Get a single vault entry with decrypted value
 * - PATCH  /api/vault/:id      — Update a vault entry
 * - DELETE /api/vault/:id      — Delete a vault entry
 */

import { Router } from 'express';
import type { ServiceContainer } from '../../server/services.js';
import { createCreateHandler } from './create.js';
import { createListHandler } from './list.js';
import { createGetHandler } from './get.js';
import { createUpdateHandler } from './update.js';
import { createDeleteHandler } from './delete.js';
import { createSearchHandler } from './search.js';

export function createVaultRoutes(services: ServiceContainer): Router {
  const router = Router();
  const { vaultService } = services;

  // Search must be registered before the :id param route
  router.get('/search', createSearchHandler(vaultService));

  router.post('/', createCreateHandler(vaultService));
  router.get('/', createListHandler(vaultService));
  router.get('/:id', createGetHandler(vaultService));
  router.patch('/:id', createUpdateHandler(vaultService));
  router.delete('/:id', createDeleteHandler(vaultService));

  return router;
}
