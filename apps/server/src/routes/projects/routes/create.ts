/**
 * POST /create endpoint - Create a new project
 */

import type { Request, Response } from 'express';
import { getErrorMessage, logError } from '../common.js';
import type { ProjectService } from '../../../services/project-service.js';
import type { CreateProjectInput } from '@automaker/types';

export function createCreateHandler(projectService: ProjectService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, project } = req.body as {
        projectPath: string;
        project: CreateProjectInput;
      };

      if (!projectPath || !project) {
        res.status(400).json({
          success: false,
          error: 'projectPath and project are required',
        });
        return;
      }

      if (!project.title || !project.goal) {
        res.status(400).json({
          success: false,
          error: 'project.title and project.goal are required',
        });
        return;
      }

      const created = await projectService.createProject(projectPath, project);
      res.json({ success: true, project: created });
    } catch (error) {
      logError(error, 'Create project failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
