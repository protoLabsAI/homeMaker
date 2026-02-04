/**
 * POST /list endpoint - List all projects for a project path
 */

import type { Request, Response } from 'express';
import { getErrorMessage, logError } from '../common.js';
import type { ProjectService } from '../../../services/project-service.js';

export function createListHandler(projectService: ProjectService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath } = req.body as { projectPath: string };

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      const projects = await projectService.listProjects(projectPath);
      res.json({ success: true, projects });
    } catch (error) {
      logError(error, 'List projects failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
