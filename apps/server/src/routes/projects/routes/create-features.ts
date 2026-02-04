/**
 * POST /create-features endpoint - Create features from a project's phases
 */

import type { Request, Response } from 'express';
import { getErrorMessage, logError } from '../common.js';
import type { ProjectService } from '../../../services/project-service.js';
import type { CreateFeaturesFromProjectOptions } from '@automaker/types';

export function createCreateFeaturesHandler(projectService: ProjectService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, projectSlug, options } = req.body as {
        projectPath: string;
        projectSlug: string;
        options?: CreateFeaturesFromProjectOptions;
      };

      if (!projectPath || !projectSlug) {
        res.status(400).json({
          success: false,
          error: 'projectPath and projectSlug are required',
        });
        return;
      }

      const result = await projectService.createFeaturesFromProject(
        projectPath,
        projectSlug,
        options
      );

      res.json({ success: true, result });
    } catch (error) {
      logError(error, 'Create features from project failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
