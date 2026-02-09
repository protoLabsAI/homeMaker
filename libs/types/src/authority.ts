/**
 * Authority Types - Agent authorization state and work item tracking
 *
 * Defines the runtime state of agents operating under authority policies,
 * their current proposals, delegations, and the work items they manage.
 */

import type {
  AuthorityRole,
  PolicyActionType,
  ActionProposal,
  TrustLevel,
  RiskLevel,
} from './policy.js';

/**
 * WorkItemState - Workflow states for tracked work items
 * Represents the lifecycle from conception to completion
 */
export type WorkItemState =
  | 'idea'
  | 'pending_pm_review'
  | 'pm_review'
  | 'pm_processing'
  | 'prd_ready'
  | 'pm_changes_requested'
  | 'approved'
  | 'rejected'
  | 'research'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'testing'
  | 'done';

/**
 * AuthorityAgent - Runtime state of an agent operating under authority
 * Tracks trust level, current proposals, delegations, and managed work
 */
export interface AuthorityAgent {
  /** Unique agent identifier */
  id: string;
  /** Agent's organizational role */
  role: AuthorityRole;
  /** Current operational status */
  status: 'active' | 'paused' | 'suspended' | 'inactive';
  /** Trust level (0=Manual, 1=Assisted, 2=Conditional, 3=Autonomous) */
  trust: TrustLevel;
  /** IDs of agents this agent supervises or can delegate to */
  subAgentIds: string[];
  /** ID of parent agent (if supervised by another) */
  parentAgentId?: string;
  /** Current action proposal being executed */
  currentProposal?: {
    proposalId: string;
    actionType: PolicyActionType;
    target: string;
    startedAt: string; // ISO timestamp
  };
}

/**
 * AuthorizedWorkItem - An item of work tracked within the authority system
 * Can be features, tasks, or work packages with status and responsibility tracking
 */
export interface AuthorizedWorkItem {
  /** Unique work item identifier */
  id: string;
  /** Descriptive title */
  title: string;
  /** Detailed description */
  description: string;
  /** Current workflow state */
  state: WorkItemState;
  /** Role responsible for this work item */
  assignedRole: AuthorityRole;
  /** Specific agent assigned (if any) */
  assignedAgentId?: string;
  /** Risk level for this work item */
  riskLevel: RiskLevel;
  /** Estimated effort (points or hours) */
  estimate?: number;
  /** Time created */
  createdAt: string; // ISO timestamp
  /** Time last updated */
  updatedAt: string; // ISO timestamp
  /** Time marked as done (if applicable) */
  completedAt?: string; // ISO timestamp
}
