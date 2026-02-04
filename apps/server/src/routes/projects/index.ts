/**
 * Projects routes - HTTP API for project orchestration
 */

import { Router } from 'express';
import { ProjectService } from '../../services/project-service.js';
import type { FeatureLoader } from '../../services/feature-loader.js';
import { validatePathParams } from '../../middleware/validate-paths.js';
import { createListHandler } from './routes/list.js';
import { createGetHandler } from './routes/get.js';
import { createCreateHandler } from './routes/create.js';
import { createUpdateHandler } from './routes/update.js';
import { createDeleteHandler } from './routes/delete.js';
import { createCreateFeaturesHandler } from './routes/create-features.js';

export function createProjectsRoutes(featureLoader: FeatureLoader): Router {
  const router = Router();
  const projectService = new ProjectService(featureLoader);

  router.post('/list', validatePathParams('projectPath'), createListHandler(projectService));
  router.post('/get', validatePathParams('projectPath'), createGetHandler(projectService));
  router.post('/create', validatePathParams('projectPath'), createCreateHandler(projectService));
  router.post('/update', validatePathParams('projectPath'), createUpdateHandler(projectService));
  router.post('/delete', validatePathParams('projectPath'), createDeleteHandler(projectService));
  router.post(
    '/create-features',
    validatePathParams('projectPath'),
    createCreateFeaturesHandler(projectService)
  );

  return router;
}
