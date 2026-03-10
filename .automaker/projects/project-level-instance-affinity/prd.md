# PRD: Project-Level Instance Affinity

## Situation
Multi-instance Ava coordination uses feature-level fleet scheduling via FleetSchedulerService. Instances broadcast work inventories, a primary scheduler distributes features round-robin by capacity, and conflicts are detected post-hoc. Work-stealing and escalation handoffs add further complexity.

## Problem
Feature-level scheduling creates 5 friction points: claim races (two instances grab same feature), work-stealing races, escalation acceptance races, stale inventory snapshots, and no capacity reservation. All stem from multiple instances competing for individual features. The fleet scheduler is ~1100 lines of complexity solving problems that shouldn't exist.

## Approach
Move the scheduling boundary UP to child projects. Each instance owns entire projects, not features. Assignment stored on Project type via CRDT. Auto-mode filters features by project ownership. Config declares soft preferences, runtime API sets hard assignments. Auto-failover claims orphaned projects when instances go stale. Two project types: finite (milestones, completes) and ongoing (continuous intake like bugs). Remove fleet scheduler, work-stealing, and feature-level conflict resolution entirely.

## Results
Zero race conditions (structurally impossible). ~1300 lines removed (fleet scheduler + work-stealing). Simpler mental model: instance owns project, processes its backlog. Auto-failover handles instance outages. Clean ongoing project pattern for continuous work like bugs and maintenance.

## Constraints
Greenfield-first: no backward compat shims for removed fleet scheduler types,Single-instance setups (no proto.config.yaml) must continue working with no config changes,Assignment fields must sync via existing CRDT infrastructure, no new sync mechanisms,Capacity heartbeat must be preserved for failover detection,Feature creation must stamp createdByInstance for unassigned feature ownership
