import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Plus,
  Loader2,
  Milestone,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@protolabs-ai/ui/atoms';
import { Button } from '@protolabs-ai/ui/atoms';
import { Spinner } from '@protolabs-ai/ui/atoms';
import Markdown from 'react-markdown';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  researching: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  drafting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  reviewing: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  scaffolded: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  active: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
};

interface ProjectSummary {
  slug: string;
  title: string;
  goal: string;
  status: string;
  linearProjectUrl?: string;
  milestones?: Array<{
    title: string;
    description: string;
    status: string;
    phases: Array<{ title: string; description: string; complexity?: string; status?: string }>;
  }>;
  prd?: {
    situation: string;
    problem: string;
    approach: string;
    results: string;
    constraints: string;
  };
}

const SPARC_SECTIONS = [
  { key: 'situation', label: 'Situation', color: 'text-blue-400' },
  { key: 'problem', label: 'Problem', color: 'text-rose-400' },
  { key: 'approach', label: 'Approach', color: 'text-emerald-400' },
  { key: 'results', label: 'Results', color: 'text-amber-400' },
  { key: 'constraints', label: 'Constraints', color: 'text-violet-400' },
] as const;

function CollapsibleSection({
  label,
  color,
  content,
  defaultOpen = false,
}: {
  label: string;
  color: string;
  content: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/20 rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <h4 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</h4>
      </button>
      {open && (
        <div className="px-3 pb-3 prose prose-sm prose-invert max-w-none prose-p:text-foreground/90 prose-headings:text-foreground prose-li:text-foreground/90 prose-strong:text-foreground">
          <Markdown>{content}</Markdown>
        </div>
      )}
    </div>
  );
}

export function ProjectsView() {
  const projectPath = useAppStore((s) => s.currentProject?.path);
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Fetch project slugs
  const { data: listData, isLoading: isLoadingList } = useQuery({
    queryKey: ['projects-list', projectPath],
    queryFn: async () => {
      const api = getHttpApiClient();
      return api.lifecycle.listProjects(projectPath || '');
    },
    enabled: !!projectPath,
  });

  // Fetch details for each project slug
  const { data: projectDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['projects-details', projectPath, listData?.projects],
    queryFn: async () => {
      const api = getHttpApiClient();
      const slugs = listData?.projects || [];
      const results: ProjectSummary[] = [];
      for (const slug of slugs) {
        const res = await api.lifecycle.getProject(projectPath || '', slug);
        if (res.success && res.project) {
          results.push(res.project as ProjectSummary);
        }
      }
      return results;
    },
    enabled: !!projectPath && !!listData?.projects && listData.projects.length > 0,
  });

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const api = getHttpApiClient();
      return api.lifecycle.initiate(projectPath || '', newTitle, newDescription);
    },
    onSuccess: (result) => {
      if (result.hasDuplicates) {
        toast.warning('Duplicate project detected in Linear', {
          description: `Found ${result.duplicates?.length} existing project(s) with a similar name.`,
        });
      } else {
        toast.success('Project created', {
          description: `Created "${newTitle}" (${result.localSlug})`,
        });
      }
      setNewTitle('');
      setNewDescription('');
      setShowNewProjectInput(false);
      queryClient.invalidateQueries({ queryKey: ['projects-list', projectPath] });
    },
    onError: (error) => {
      toast.error(
        `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const handleCreateProject = useCallback(() => {
    if (!newTitle.trim()) {
      toast.error('Project title is required');
      return;
    }
    if (!newDescription.trim()) {
      toast.error('Project description is required');
      return;
    }
    initiateMutation.mutate();
  }, [newTitle, newDescription, initiateMutation]);

  const projects = projectDetails || [];
  const selectedProject = selectedSlug ? projects.find((p) => p.slug === selectedSlug) : null;
  const isLoading = isLoadingList || isLoadingDetails;

  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Open a project to view its plans.</p>
      </div>
    );
  }

  // Detail view for selected project
  if (selectedProject) {
    const statusClass = STATUS_COLORS[selectedProject.status] || 'bg-muted text-muted-foreground';
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Detail Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setSelectedSlug(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground tracking-tight truncate">
                  {selectedProject.title}
                </h1>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] uppercase tracking-wider shrink-0', statusClass)}
                >
                  {selectedProject.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedProject.slug}</p>
            </div>
            {selectedProject.linearProjectUrl && (
              <a
                href={selectedProject.linearProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Goal */}
          {selectedProject.goal && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Goal
              </h3>
              <p className="text-sm text-foreground/90">{selectedProject.goal}</p>
            </div>
          )}

          {/* PRD (SPARC sections) */}
          {selectedProject.prd && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                PRD
              </h3>
              {SPARC_SECTIONS.map(({ key, label, color }) => {
                const content = selectedProject.prd?.[key as keyof typeof selectedProject.prd];
                if (!content) return null;
                return (
                  <CollapsibleSection
                    key={key}
                    label={label}
                    color={color}
                    content={content}
                    defaultOpen={key === 'situation'}
                  />
                );
              })}
            </div>
          )}

          {/* Milestones */}
          {selectedProject.milestones && selectedProject.milestones.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Milestones
              </h3>
              {selectedProject.milestones.map((ms, i) => (
                <div key={i} className="border border-border/30 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{ms.title}</span>
                      {ms.status && (
                        <Badge variant="outline" className="text-[10px]">
                          {ms.status}
                        </Badge>
                      )}
                    </div>
                    {ms.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ms.description}</p>
                    )}
                  </div>
                  {ms.phases && ms.phases.length > 0 && (
                    <div className="divide-y divide-border/20">
                      {ms.phases.map((phase, j) => (
                        <div key={j} className="px-3 py-1.5 flex items-center gap-2">
                          <span className="text-xs text-foreground/80 flex-1">{phase.title}</span>
                          {phase.complexity && (
                            <span className="text-[10px] text-muted-foreground">
                              {phase.complexity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state — no PRD and no milestones */}
          {!selectedProject.prd &&
            (!selectedProject.milestones || selectedProject.milestones.length === 0) && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No PRD or milestones yet. Generate a PRD to start planning.
                </p>
              </div>
            )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center border border-violet-500/20">
              <FolderKanban className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Projects</h1>
              <p className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewProjectInput(!showNewProjectInput)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProjectInput && (
        <div className="shrink-0 px-6 py-4 border-b border-border/40 bg-muted/20 space-y-3">
          <input
            type="text"
            placeholder="Project title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-background border border-border/50',
              'text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-violet-500/30'
            )}
            autoFocus
          />
          <textarea
            placeholder="Describe the project goal..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm resize-none',
              'bg-background border border-border/50',
              'text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-violet-500/30'
            )}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewProjectInput(false);
                setNewTitle('');
                setNewDescription('');
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateProject} disabled={initiateMutation.isPending}>
              {initiateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-5 h-5" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create a new project to start planning with PRDs and milestones.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const phaseCount =
                project.milestones?.reduce((sum, ms) => sum + (ms.phases?.length || 0), 0) || 0;
              const statusClass = STATUS_COLORS[project.status] || 'bg-muted text-muted-foreground';

              return (
                <button
                  key={project.slug}
                  type="button"
                  onClick={() => setSelectedSlug(project.slug)}
                  className={cn(
                    'w-full text-left rounded-lg border border-border/40 p-4',
                    'bg-card/50 hover:bg-card/80 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        {project.milestones && project.milestones.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Milestone className="w-3 h-3" />
                            {project.milestones.length} milestone
                            {project.milestones.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {phaseCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Layers className="w-3 h-3" />
                            {phaseCount} phase{phaseCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] uppercase tracking-wider shrink-0', statusClass)}
                    >
                      {project.status}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
