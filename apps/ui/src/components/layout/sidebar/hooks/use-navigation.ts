import { useMemo } from 'react';
import type { NavigateOptions } from '@tanstack/react-router';
import {
  LayoutGrid,
  Inbox,
  Settings,
  NotebookPen,
  CalendarDays,
  CalendarClock,
  ListTodo,
  MessageSquare,
  MessageCircle,
  Home,
  Package,
  Trophy,
  Cpu,
  DollarSign,
  KeyRound,
  Store,
} from 'lucide-react';
import type { NavSection, NavItem } from '../types';
import type { KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import type { Project } from '@/lib/electron';

interface UseNavigationProps {
  shortcuts: {
    toggleSidebar: string;
    openProject: string;
    projectPicker: string;
    cyclePrevProject: string;
    cycleNextProject: string;
    notes: string;
    board: string;
    settings: string;
    inbox: string;
    calendar: string;
    todo: string;
    automations: string;
    chat: string;
  };
  currentProject: Project | null;
  projects: Project[];
  projectHistory: string[];
  navigate: (opts: NavigateOptions) => void;
  toggleSidebar: () => void;
  handleOpenFolder: () => void;
  cyclePrevProject: () => void;
  cycleNextProject: () => void;
  /** Count of unread notifications to show on Notifications nav item */
  unreadNotificationsCount?: number;
}

export function useNavigation({
  shortcuts,
  currentProject,
  projects,
  projectHistory,
  navigate,
  toggleSidebar,
  handleOpenFolder,
  cyclePrevProject,
  cycleNextProject,
  unreadNotificationsCount,
}: UseNavigationProps) {
  // Build navigation sections
  const navSections: NavSection[] = useMemo(() => {
    // Home management navigation items
    const homeItems: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
      },
      {
        id: 'board',
        label: 'Board',
        icon: LayoutGrid,
        shortcut: shortcuts.board,
      },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: CalendarDays,
        shortcut: shortcuts.calendar,
      },
      {
        id: 'todo',
        label: 'Todo',
        icon: ListTodo,
        shortcut: shortcuts.todo,
      },
      {
        id: 'notes',
        label: 'Notes',
        icon: NotebookPen,
        shortcut: shortcuts.notes,
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        icon: CalendarClock,
      },
      {
        id: 'chat',
        label: 'Chat',
        icon: MessageSquare,
        shortcut: shortcuts.chat,
      },
      {
        id: 'chat-channel',
        label: 'Household',
        icon: MessageCircle,
      },
      {
        id: 'sensors',
        label: 'Sensors',
        icon: Cpu,
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Package,
      },
      {
        id: 'budget',
        label: 'Budget',
        icon: DollarSign,
      },
      {
        id: 'vault',
        label: 'Vault',
        icon: KeyRound,
      },
      {
        id: 'vendors',
        label: 'Vendors',
        icon: Store,
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: Trophy,
      },
    ];

    const sections: NavSection[] = [
      {
        label: 'Home',
        items: homeItems,
      },
    ];

    // Add Inbox and Settings as a standalone section (no label for visual separation)
    const inboxCount = unreadNotificationsCount ?? 0;
    sections.push({
      label: '',
      items: [
        {
          id: 'inbox',
          label: 'Inbox',
          icon: Inbox,
          shortcut: shortcuts.inbox,
          count: inboxCount || undefined,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          shortcut: shortcuts.settings,
        },
      ],
    });

    return sections;
  }, [shortcuts, unreadNotificationsCount]);

  // Build keyboard shortcuts for navigation
  const navigationShortcuts: KeyboardShortcut[] = useMemo(() => {
    const shortcutsList: KeyboardShortcut[] = [];

    // Sidebar toggle shortcut - always available
    shortcutsList.push({
      key: shortcuts.toggleSidebar,
      action: () => toggleSidebar(),
      description: 'Toggle sidebar',
    });

    // Open project shortcut - opens the folder selection dialog directly
    shortcutsList.push({
      key: shortcuts.openProject,
      action: () => handleOpenFolder(),
      description: 'Open folder selection dialog',
    });

    // Project cycling shortcuts - only when we have project history
    if (projectHistory.length > 1) {
      shortcutsList.push({
        key: shortcuts.cyclePrevProject,
        action: () => cyclePrevProject(),
        description: 'Cycle to previous project (MRU)',
      });
      shortcutsList.push({
        key: shortcuts.cycleNextProject,
        action: () => cycleNextProject(),
        description: 'Cycle to next project (LRU)',
      });
    }

    // Only enable nav shortcuts if there's a current project
    if (currentProject) {
      navSections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.shortcut) {
            shortcutsList.push({
              key: item.shortcut,
              action: item.action
                ? () => item.action!()
                : () => navigate({ to: `/${item.id}` as unknown as '/' }),
              description: item.action ? `Toggle ${item.label}` : `Navigate to ${item.label}`,
            });
          }
        });
      });

      // Add global settings shortcut
      shortcutsList.push({
        key: shortcuts.settings,
        action: () => navigate({ to: '/settings' }),
        description: 'Navigate to Global Settings',
      });

      // Add automations shortcut (navigates to Settings > Automations)
      shortcutsList.push({
        key: shortcuts.automations,
        action: () => navigate({ to: '/settings', search: { view: 'automations' } }),
        description: 'Navigate to Automations',
      });
    }

    return shortcutsList;
  }, [
    shortcuts,
    currentProject,
    navigate,
    toggleSidebar,
    projects.length,
    handleOpenFolder,
    projectHistory.length,
    cyclePrevProject,
    cycleNextProject,
    navSections,
  ]);

  return {
    navSections,
    navigationShortcuts,
  };
}
