# Project: Project-Level Instance Affinity

## Goal
Replace feature-level fleet scheduling with project-level instance assignment. Instances own child projects, not individual features. Eliminates race conditions, work-stealing complexity, and ~1300 lines of fleet scheduler code.

## Milestones
1. Foundation Types - Core type changes that all other features depend on. Must merge before Wave 2 starts.
2. Core Services - Service layer changes: new assignment service, updated feature selection, fleet scheduler removal. Parallelizable within this wave.
3. Integration - MCP tools, escalation simplification, and auto-failover timer. Parallelizable within this wave.
