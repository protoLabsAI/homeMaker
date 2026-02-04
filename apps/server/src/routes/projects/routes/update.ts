/**
 * POST /update endpoint - Update an existing project
 */

import type { Request, Response } from 'express';
import { getErrorMessage, logError } from '../common.js';
import type { ProjectService } from '../../../services/project-service.js';
import type { UpdateProjectInput } from '@automaker/types';

export function createUpdateHandler(projectService: ProjectService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, projectSlug, updates } = req.body as {
        projectPath: string;
        projectSlug: string;
        updates: UpdateProjectInput;
      };

      if (!projectPath || !projectSlug) {
        res.status(400).json({
          success: false,
          error: 'projectPath and projectSlug are required',
        });
        return;
      }

      const updated = await projectService.updateProject(projectPath, projectSlug, updates);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: `Project "${projectSlug}" not found`,
        });
        return;
      }

      res.json({ success: true, project: updated });
    } catch (error) {
      logError(error, 'Update project failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
