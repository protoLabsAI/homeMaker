/**
 * POST /get endpoint - Get a specific project by slug
 */

import type { Request, Response } from 'express';
import { getErrorMessage, logError } from '../common.js';
import type { ProjectService } from '../../../services/project-service.js';

export function createGetHandler(projectService: ProjectService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, projectSlug } = req.body as {
        projectPath: string;
        projectSlug: string;
      };

      if (!projectPath || !projectSlug) {
        res.status(400).json({
          success: false,
          error: 'projectPath and projectSlug are required',
        });
        return;
      }

      const project = await projectService.getProject(projectPath, projectSlug);
      if (!project) {
        res.status(404).json({
          success: false,
          error: `Project "${projectSlug}" not found`,
        });
        return;
      }

      res.json({ success: true, project });
    } catch (error) {
      logError(error, 'Get project failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
