/**
 * Project Parser - Utilities for parsing and generating project markdown files
 *
 * Handles parsing of project.md, milestone.md, and phase.md files
 * as well as generating markdown from Project objects.
 */

import type {
  Project,
  Milestone,
  Phase,
  SparcPRD,
  ProjectStatus,
  MilestoneStatus,
  PhaseStatus,
  PhaseComplexity,
} from '@automaker/types';
import { slugify } from './string-utils.js';

/**
 * Generate a project.md file content from a Project object
 */
export function generateProjectMarkdown(project: Project): string {
  const lines: string[] = [];

  lines.push(`# Project: ${project.title}`);
  lines.push('');
  lines.push(`## Goal`);
  lines.push(project.goal);
  lines.push('');

  if (project.prd) {
    lines.push('## PRD');
    lines.push('');
    lines.push('### Situation');
    lines.push(project.prd.situation);
    lines.push('');
    lines.push('### Problem');
    lines.push(project.prd.problem);
    lines.push('');
    lines.push('### Approach');
    lines.push(project.prd.approach);
    lines.push('');
    lines.push('### Results');
    lines.push(project.prd.results);
    lines.push('');
    if (project.prd.constraints.length > 0) {
      lines.push('### Constraints');
      for (const constraint of project.prd.constraints) {
        lines.push(`- ${constraint}`);
      }
      lines.push('');
    }
  }

  if (project.milestones.length > 0) {
    lines.push('## Milestones');
    for (let i = 0; i < project.milestones.length; i++) {
      const milestone = project.milestones[i];
      lines.push(`${i + 1}. ${milestone.title} - ${milestone.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a milestone.md file content from a Milestone object
 */
export function generateMilestoneMarkdown(milestone: Milestone): string {
  const lines: string[] = [];

  lines.push(`# Milestone: ${milestone.title}`);
  lines.push('');
  lines.push('## Description');
  lines.push(milestone.description);
  lines.push('');

  if (milestone.phases.length > 0) {
    lines.push('## Phases');
    for (let i = 0; i < milestone.phases.length; i++) {
      const phase = milestone.phases[i];
      lines.push(`${i + 1}. ${phase.title} - ${phase.description}`);
    }
    lines.push('');
  }

  if (milestone.dependencies && milestone.dependencies.length > 0) {
    lines.push('## Dependencies');
    for (const dep of milestone.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a phase.md file content from a Phase object
 */
export function generatePhaseMarkdown(phase: Phase): string {
  const lines: string[] = [];

  lines.push(`# Phase: ${phase.title}`);
  lines.push('');
  lines.push('## Description');
  lines.push(phase.description);
  lines.push('');

  if (phase.filesToModify && phase.filesToModify.length > 0) {
    lines.push('## Files to Modify');
    for (const file of phase.filesToModify) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (phase.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    for (const criterion of phase.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
    lines.push('');
  }

  lines.push('## Estimated Complexity');
  lines.push(capitalizeFirst(phase.complexity));
  lines.push('');

  if (phase.dependencies && phase.dependencies.length > 0) {
    lines.push('## Dependencies');
    for (const dep of phase.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse a project.md file content into partial Project data
 */
export function parseProjectMarkdown(content: string): Partial<Project> {
  const lines = content.split('\n');
  const project: Partial<Project> = {
    milestones: [],
  };

  let currentSection = '';
  let prdSection = '';
  const sectionContent: string[] = [];

  for (const line of lines) {
    // Check for main headings
    if (line.startsWith('# Project:')) {
      project.title = line.replace('# Project:', '').trim();
      continue;
    }

    // Check for section headings
    if (line.startsWith('## ')) {
      // Save previous section
      saveParsedSection(project, currentSection, prdSection, sectionContent.join('\n').trim());
      sectionContent.length = 0;

      currentSection = line.replace('## ', '').trim().toLowerCase();
      prdSection = '';
      continue;
    }

    // Check for PRD sub-headings
    if (line.startsWith('### ') && currentSection === 'prd') {
      // Save previous PRD section
      if (prdSection) {
        saveParsedSection(project, currentSection, prdSection, sectionContent.join('\n').trim());
        sectionContent.length = 0;
      }
      prdSection = line.replace('### ', '').trim().toLowerCase();
      continue;
    }

    sectionContent.push(line);
  }

  // Save final section
  saveParsedSection(project, currentSection, prdSection, sectionContent.join('\n').trim());

  return project;
}

function saveParsedSection(
  project: Partial<Project>,
  section: string,
  prdSection: string,
  content: string
): void {
  if (!content) return;

  switch (section) {
    case 'goal':
      project.goal = content;
      break;
    case 'milestones':
      project.milestones = parseMilestoneList(content);
      break;
    case 'prd':
      if (!project.prd) {
        project.prd = {
          situation: '',
          problem: '',
          approach: '',
          results: '',
          constraints: [],
        };
      }
      switch (prdSection) {
        case 'situation':
          project.prd.situation = content;
          break;
        case 'problem':
          project.prd.problem = content;
          break;
        case 'approach':
          project.prd.approach = content;
          break;
        case 'results':
          project.prd.results = content;
          break;
        case 'constraints':
          project.prd.constraints = parseListItems(content);
          break;
      }
      break;
  }
}

function parseMilestoneList(content: string): Milestone[] {
  const milestones: Milestone[] = [];
  const lines = content.split('\n').filter((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\d+\.\s+(.+?)(?:\s+-\s+(.+))?$/);
    if (match) {
      const title = match[1].trim();
      const description = match[2]?.trim() || '';
      milestones.push({
        id: `${String(i + 1).padStart(2, '0')}-${slugify(title, 30)}`,
        title,
        description,
        phases: [],
        status: 'pending' as MilestoneStatus,
      });
    }
  }

  return milestones;
}

/**
 * Parse a milestone.md file content into partial Milestone data
 */
export function parseMilestoneMarkdown(content: string): Partial<Milestone> {
  const lines = content.split('\n');
  const milestone: Partial<Milestone> = {
    phases: [],
  };

  let currentSection = '';
  const sectionContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# Milestone:')) {
      milestone.title = line.replace('# Milestone:', '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      // Save previous section
      saveMilestoneSection(milestone, currentSection, sectionContent.join('\n').trim());
      sectionContent.length = 0;
      currentSection = line.replace('## ', '').trim().toLowerCase();
      continue;
    }

    sectionContent.push(line);
  }

  // Save final section
  saveMilestoneSection(milestone, currentSection, sectionContent.join('\n').trim());

  return milestone;
}

function saveMilestoneSection(
  milestone: Partial<Milestone>,
  section: string,
  content: string
): void {
  if (!content) return;

  switch (section) {
    case 'description':
      milestone.description = content;
      break;
    case 'phases':
      milestone.phases = parsePhaseList(content);
      break;
    case 'dependencies':
      milestone.dependencies = parseListItems(content);
      break;
  }
}

function parsePhaseList(content: string): Phase[] {
  const phases: Phase[] = [];
  const lines = content.split('\n').filter((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\d+\.\s+(.+?)(?:\s+-\s+(.+))?$/);
    if (match) {
      const title = match[1].trim();
      const description = match[2]?.trim() || '';
      phases.push({
        id: `phase-${String(i + 1).padStart(2, '0')}-${slugify(title, 30)}`,
        title,
        description,
        acceptanceCriteria: [],
        complexity: 'medium' as PhaseComplexity,
        status: 'pending' as PhaseStatus,
      });
    }
  }

  return phases;
}

/**
 * Parse a phase.md file content into partial Phase data
 */
export function parsePhaseMarkdown(content: string): Partial<Phase> {
  const lines = content.split('\n');
  const phase: Partial<Phase> = {
    acceptanceCriteria: [],
  };

  let currentSection = '';
  const sectionContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# Phase:')) {
      phase.title = line.replace('# Phase:', '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      // Save previous section
      savePhaseSection(phase, currentSection, sectionContent.join('\n').trim());
      sectionContent.length = 0;
      currentSection = line.replace('## ', '').trim().toLowerCase();
      continue;
    }

    sectionContent.push(line);
  }

  // Save final section
  savePhaseSection(phase, currentSection, sectionContent.join('\n').trim());

  return phase;
}

function savePhaseSection(phase: Partial<Phase>, section: string, content: string): void {
  if (!content) return;

  switch (section) {
    case 'description':
      phase.description = content;
      break;
    case 'files to modify':
      phase.filesToModify = parseListItems(content);
      break;
    case 'acceptance criteria':
      phase.acceptanceCriteria = parseChecklistItems(content);
      break;
    case 'estimated complexity':
      phase.complexity = parseComplexity(content);
      break;
    case 'dependencies':
      phase.dependencies = parseListItems(content);
      break;
  }
}

function parseListItems(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

function parseChecklistItems(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*\[[ x]\]\s*/i, '').trim())
    .filter((line) => line.length > 0);
}

function parseComplexity(content: string): PhaseComplexity {
  const lower = content.toLowerCase().trim();
  if (lower.includes('small') || lower.includes('low')) return 'small';
  if (lower.includes('large') || lower.includes('high')) return 'large';
  return 'medium';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a project slug from a title
 */
export function generateProjectSlug(title: string): string {
  return slugify(title, 50);
}

/**
 * Generate a milestone slug with index prefix
 */
export function generateMilestoneSlug(index: number, title: string): string {
  return `${String(index + 1).padStart(2, '0')}-${slugify(title, 30)}`;
}

/**
 * Generate a phase filename with index prefix
 */
export function generatePhaseFilename(index: number, title: string): string {
  return `phase-${String(index + 1).padStart(2, '0')}-${slugify(title, 30)}.md`;
}

/**
 * Create a new Project object with defaults
 */
export function createProject(
  title: string,
  goal: string,
  options?: {
    prd?: SparcPRD;
    milestones?: Omit<Milestone, 'id' | 'status' | 'epicId'>[];
  }
): Project {
  const now = new Date().toISOString();
  const slug = generateProjectSlug(title);

  const milestones: Milestone[] = (options?.milestones || []).map((m, i) => ({
    ...m,
    id: generateMilestoneSlug(i, m.title),
    status: 'pending' as MilestoneStatus,
    phases: m.phases.map((p, j) => ({
      ...p,
      id: `${generateMilestoneSlug(i, m.title)}-phase-${String(j + 1).padStart(2, '0')}-${slugify(p.title, 20)}`,
      status: 'pending' as PhaseStatus,
    })),
  }));

  return {
    slug,
    title,
    goal,
    status: 'drafting' as ProjectStatus,
    prd: options?.prd,
    milestones,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a feature description from a Phase object
 */
export function phaseToFeatureDescription(phase: Phase, milestone?: Milestone): string {
  const lines: string[] = [];

  lines.push(phase.description);
  lines.push('');

  if (phase.filesToModify && phase.filesToModify.length > 0) {
    lines.push('**Files to Modify:**');
    for (const file of phase.filesToModify) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (phase.acceptanceCriteria.length > 0) {
    lines.push('**Acceptance Criteria:**');
    for (const criterion of phase.acceptanceCriteria) {
      lines.push(`- ${criterion}`);
    }
    lines.push('');
  }

  if (milestone) {
    lines.push(`**Milestone:** ${milestone.title}`);
    lines.push(`**Complexity:** ${capitalizeFirst(phase.complexity)}`);
  }

  return lines.join('\n').trim();
}

/**
 * Generate a branch name from a phase title
 */
export function phaseToBranchName(
  projectSlug: string,
  milestoneSlug: string,
  phaseTitle: string
): string {
  return `feature/${projectSlug}/${milestoneSlug}/${slugify(phaseTitle, 30)}`;
}
