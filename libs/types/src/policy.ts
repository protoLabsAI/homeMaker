/**
 * Policy and Trust Types - Authorization and decision-making for Automaker agents
 *
 * Defines the type system for policy-based access control, trust levels, risk assessment,
 * and authorization workflows. Enables role-based permissions, approval workflows, and
 * delegation rules for autonomous agents.
 */

/**
 * TrustLevel - Determines the autonomy level for an agent or role
 * Ranges from manual approval-required to full autonomous execution
 */
export type TrustLevel = 0 | 1 | 2 | 3;

/**
 * RiskLevel - Categorizes the risk impact of an action
 * Used to determine approval requirements and audit trails
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * AuthorityRole - Available organizational roles for policy definitions
 * Maps to team members and their responsibilities
 */
export type AuthorityRole =
  | 'cto'
  | 'product-manager'
  | 'project-manager'
  | 'engineering-manager'
  | 'principal-engineer';

/**
 * PolicyActionType - All actions that can be controlled by policies
 * Encompasses work creation, modifications, approvals, and release gates
 */
export type PolicyActionType =
  | 'create_work'
  | 'assign_work'
  | 'change_scope'
  | 'change_estimate'
  | 'block_release'
  | 'escalate'
  | 'transition_status'
  | 'approve_work'
  | 'delegate'
  | 'modify_architecture'
  | 'update_status'
  | 'create_pr'
  | 'merge_pr';

/**
 * ActionProposal - Request to perform a policy-controlled action
 * Submitted by agents and evaluated against policies before execution
 */
export interface ActionProposal {
  /** Agent or entity proposing the action */
  who: string;
  /** The action being proposed */
  what: PolicyActionType;
  /** Target resource (feature ID, work item, etc.) */
  target: string;
  /** Rationale for the proposed action */
  justification: string;
  /** Risk level of this specific action */
  risk: RiskLevel;
  /** Optional status transition (if applicable) */
  statusTransition?: {
    from: string;
    to: string;
  };
}

/**
 * PolicyDecision - Result of policy evaluation
 * Determines whether an action is allowed, denied, or requires approval
 */
export interface PolicyDecision {
  /** Allow, deny, or require approval */
  verdict: 'allow' | 'deny' | 'require_approval';
  /** Reason for the decision */
  reason: string;
  /** ID of approver required (when verdict is require_approval) */
  approver?: string;
}

/**
 * TrustProfile - Agent or role's trust credentials and limits
 * Defines autonomy level and risk tolerance
 */
export interface TrustProfile {
  /** Role identifier */
  role: AuthorityRole;
  /** Trust level (0=Manual, 1=Assisted, 2=Conditional, 3=Autonomous) */
  trustLevel: TrustLevel;
  /** Maximum risk level allowed without approval */
  maxRiskAllowed: RiskLevel;
  /** Performance statistics for this profile */
  stats: {
    totalActions: number;
    approvedActions: number;
    deniedActions: number;
    escalatedActions: number;
  };
}

/**
 * PermissionEntry - Single permission rule mapping role, action, and risk
 * Core building block for policy configuration
 */
export interface PermissionEntry {
  /** Target role */
  role: AuthorityRole;
  /** Allowed action */
  action: PolicyActionType;
  /** Whether action is allowed */
  allowed: boolean;
  /** Maximum risk level that doesn't require approval */
  maxRiskWithoutApproval: RiskLevel;
}

/**
 * StatusTransitionRule - Allowed transitions between workflow states
 * Restricts which roles can move items between statuses
 */
export interface StatusTransitionRule {
  /** Source status */
  from: string;
  /** Destination status */
  to: string;
  /** Roles allowed to perform this transition */
  allowedRoles: AuthorityRole[];
}

/**
 * PolicyConfig - Complete policy configuration for an organization
 * Aggregates permissions, transitions, trust settings, and risk thresholds
 */
export interface PolicyConfig {
  /** Permission rules (role x action x risk) */
  permissions: PermissionEntry[];
  /** Status transition rules */
  transitions: StatusTransitionRule[];
  /** Default trust level for new agents */
  defaultTrustLevel: TrustLevel;
  /** Default risk tolerance for new agents */
  defaultMaxRisk: RiskLevel;
  /** Global escalation threshold (risk level that always requires approval) */
  escalationThreshold: RiskLevel;
}

/**
 * ApprovalRequest - Pending approval for an action
 * Tracks proposals through the approval workflow
 */
export interface ApprovalRequest {
  /** Unique identifier */
  id: string;
  /** The proposed action */
  proposal: ActionProposal;
  /** Current status of the request */
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  /** Resolution details (when status is approved or denied) */
  resolution?: {
    decidedBy: string;
    decidedAt: string; // ISO timestamp
    reason: string;
  };
}

/**
 * DelegationRule - Allows one role to delegate work to another
 * Enables hierarchical delegation with action and direction constraints
 */
export interface DelegationRule {
  /** Role that can delegate */
  from: AuthorityRole;
  /** Role that can receive delegated work */
  to: AuthorityRole;
  /** Direction: 'down' (delegate to lower), 'up' (escalate), or 'lateral' (peer) */
  direction: 'down' | 'up' | 'lateral';
  /** Specific actions that can be delegated */
  allowedActions: PolicyActionType[];
}
