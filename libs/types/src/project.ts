/**
 * Project orchestration types for AutoMaker
 *
 * Supports hierarchical project planning:
 * Project → Milestones → Phases → Features
 */

/**
 * SPARC PRD structure
 * Situation, Problem, Approach, Results, Constraints
 */
export interface SparcPRD {
  situation: string; // Current state, context
  problem: string; // Specific issues to solve
  approach: string; // Proposed solution
  results: string; // Expected outcomes, metrics
  constraints: string[]; // Limitations, requirements
}

/**
 * Phase complexity levels for estimation
 */
export type PhaseComplexity = 'small' | 'medium' | 'large';

/**
 * Phase status in the workflow
 */
export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

/**
 * A phase represents a single unit of work that becomes a feature
 */
export interface Phase {
  id: string; // Auto-generated from index and title
  title: string;
  description: string;
  filesToModify?: string[];
  acceptanceCriteria: string[];
  complexity: PhaseComplexity;
  status: PhaseStatus;
  dependencies?: string[]; // IDs of phases this depends on
  featureId?: string; // ID of created feature (after scaffolding)
}

/**
 * Milestone status in the workflow
 */
export type MilestoneStatus = 'pending' | 'in-progress' | 'completed';

/**
 * A milestone groups related phases and becomes an epic
 */
export interface Milestone {
  id: string; // Auto-generated from index and title
  title: string;
  description: string;
  phases: Phase[];
  status: MilestoneStatus;
  dependencies?: string[]; // IDs of milestones this depends on
  epicId?: string; // ID of created epic feature (after scaffolding)
}

/**
 * Project status in the orchestration workflow
 */
export type ProjectStatus =
  | 'researching' // Deep research in progress
  | 'drafting' // PRD being created
  | 'reviewing' // PRD under review
  | 'approved' // Ready for scaffolding
  | 'scaffolded' // Directory structure created
  | 'active' // Features created, work in progress
  | 'completed'; // All features done

/**
 * A project is the top-level container for orchestration
 */
export interface Project {
  slug: string; // URL-safe identifier
  title: string;
  goal: string;
  status: ProjectStatus;
  prd?: SparcPRD;
  milestones: Milestone[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  researchSummary?: string; // Output from deep research
  reviewNotes?: string; // Notes from PRD review
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  title: string;
  goal: string;
  prd?: SparcPRD;
  milestones?: Omit<Milestone, 'id' | 'status' | 'epicId'>[];
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
  title?: string;
  goal?: string;
  status?: ProjectStatus;
  prd?: SparcPRD;
  researchSummary?: string;
  reviewNotes?: string;
}

/**
 * Options for creating features from a project
 */
export interface CreateFeaturesFromProjectOptions {
  createEpics?: boolean; // Create epic features for milestones
  initialStatus?: 'backlog' | 'in-progress';
  setupDependencies?: boolean; // Set up feature dependencies
}

/**
 * Result of creating features from a project
 */
export interface CreateFeaturesResult {
  projectSlug: string;
  featuresCreated: number;
  epicsCreated: number;
  featureIds: string[];
  epicIds: string[];
}
