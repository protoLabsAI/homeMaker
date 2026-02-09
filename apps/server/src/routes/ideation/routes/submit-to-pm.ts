/**
 * POST /submit-to-pm - Submit an analysis suggestion to PM Agent for PRD generation
 *
 * This endpoint creates a feature with workItemState='pending_pm_review' and emits
 * an event for the PM Agent to pick up. Unlike add-suggestion (which creates regular
 * features), this triggers the authority pipeline for formal PRD generation and review.
 *
 * Flow:
 * 1. Create feature with pending_pm_review state
 * 2. Store original suggestion in prdMetadata
 * 3. Emit ideation:submit-to-pm event
 * 4. PM Agent processes and generates SPARC PRD
 * 5. User reviews and approves/rejects PRD
 * 6. On approval, ProjM decomposes into epics
 */

import type { Request, Response } from 'express';
import type { EventEmitter } from '../../../lib/events.js';
import type { IdeationService } from '../../../services/ideation-service.js';
import type { FeatureLoader } from '../../../services/feature-loader.js';
import type { AnalysisSuggestion } from '@automaker/types';
import { getErrorMessage, logError } from '../common.js';

export function createSubmitToPMHandler(
  events: EventEmitter,
  ideationService: IdeationService,
  featureLoader: FeatureLoader
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, suggestion } = req.body as {
        projectPath: string;
        suggestion: AnalysisSuggestion;
      };

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      if (!suggestion) {
        res.status(400).json({ success: false, error: 'suggestion is required' });
        return;
      }

      if (!suggestion.title) {
        res.status(400).json({ success: false, error: 'suggestion.title is required' });
        return;
      }

      if (!suggestion.category) {
        res.status(400).json({ success: false, error: 'suggestion.category is required' });
        return;
      }

      // Build description with rationale if provided
      const description = suggestion.rationale
        ? `${suggestion.description}\n\n**Rationale:** ${suggestion.rationale}`
        : suggestion.description;

      // Map category for consistency
      const featureCategory = ideationService.mapSuggestionCategoryToFeatureCategory(
        suggestion.category
      );

      // Create feature with pending_pm_review state
      const feature = await featureLoader.create(projectPath, {
        title: suggestion.title,
        description,
        category: featureCategory,
        status: 'backlog',
        workItemState: 'pending_pm_review',
        prdMetadata: {
          generatedAt: new Date().toISOString(),
          model: 'pending', // Will be updated when PRD is generated
          originalSuggestion: {
            id: suggestion.id,
            title: suggestion.title,
            description: suggestion.description,
            category: suggestion.category,
            rationale: suggestion.rationale,
            relatedFiles: suggestion.relatedFiles,
          },
        },
      });

      // Emit event for PM Agent to pick up
      events.emit('ideation:submit-to-pm', {
        projectPath,
        featureId: feature.id,
        suggestion,
      });

      res.json({ success: true, featureId: feature.id });
    } catch (error) {
      logError(error, 'Submit suggestion to PM Agent failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
