/**
 * AvaResponder — generates AI responses to home-management chat messages.
 *
 * Uses Claude Sonnet with tool use to query real household data from
 * MaintenanceService, InventoryService, BudgetService, and VendorService.
 * Only invoked for messages classified as home-management related.
 */

import { createLogger } from '@protolabsai/utils';
import { simpleQuery } from '../providers/simple-query-service.js';
import type { MaintenanceService } from './maintenance-service.js';
import type { InventoryService } from './inventory-service.js';
import type { BudgetService } from './budget-service.js';
import type { VendorService } from './vendor-service.js';

const logger = createLogger('AvaResponder');

const RESPONDER_MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are Ava, the household AI assistant for homeMaker. You help family members with home management questions.

You have access to the household's real data. When answering questions:
- Be concise and helpful, like a knowledgeable family member
- Reference specific data from the household systems when relevant
- Keep responses under 200 words unless the question requires detail
- Be warm but not overly chatty

Current household context will be provided with each message.`;

/** Minimal service interfaces to avoid circular imports */
interface MaintenanceLike {
  getOverdue(): Array<{ id: string; title: string; nextDueAt: string; category: string }>;
  getUpcoming(days: number): Array<{ id: string; title: string; nextDueAt: string }>;
  getDueSummary(): { overdue: number; dueThisWeek: number; dueThisMonth: number; upToDate: number };
}

interface InventoryLike {
  list(filters?: Record<string, unknown>): Array<{ id: string; name: string; category: string }>;
  search(query: string): Array<{ id: string; name: string; category: string; location: string }>;
}

interface BudgetLike {
  getSummary(month: string): { totalIncome: number; totalExpenses: number; balance: number };
}

interface VendorLike {
  list(filters?: Record<string, unknown>): Array<{
    id: string;
    name: string;
    category: string | null;
    rating: number | null;
  }>;
}

export class AvaResponder {
  private maintenanceService: MaintenanceLike;
  private inventoryService: InventoryLike;
  private budgetService: BudgetLike;
  private vendorService: VendorLike;

  constructor(deps: {
    maintenanceService: MaintenanceService;
    inventoryService: InventoryService;
    budgetService: BudgetService;
    vendorService: VendorService;
  }) {
    this.maintenanceService = deps.maintenanceService;
    this.inventoryService = deps.inventoryService;
    this.budgetService = deps.budgetService;
    this.vendorService = deps.vendorService;
  }

  /**
   * Generate a response to a home-management message.
   * Gathers relevant household context and asks Claude for a response.
   */
  async respond(senderName: string, content: string): Promise<string> {
    try {
      const context = this.gatherContext();

      const prompt = `${senderName} says: "${content}"

Household context:
${context}

Respond helpfully as Ava.`;

      const result = await simpleQuery({
        prompt,
        model: RESPONDER_MODEL,
        cwd: process.cwd(),
        systemPrompt: SYSTEM_PROMPT,
        maxTurns: 1,
        allowedTools: [],
      });

      const response = result.text.trim();
      logger.info(`Generated response for ${senderName} (${response.length} chars)`);
      return response;
    } catch (error) {
      logger.error('Failed to generate response:', error);
      return "I'm having trouble accessing the household data right now. Please try again in a moment.";
    }
  }

  /**
   * Gather current household context to include in the prompt.
   * Catches errors per-module so partial context is still available.
   */
  private gatherContext(): string {
    const sections: string[] = [];

    try {
      const summary = this.maintenanceService.getDueSummary();
      const overdue = this.maintenanceService.getOverdue();
      const upcoming = this.maintenanceService.getUpcoming(7);

      sections.push(
        `Maintenance: ${summary.overdue} overdue, ${summary.dueThisWeek} due this week, ${summary.dueThisMonth} due this month`
      );
      if (overdue.length > 0) {
        const overdueList = overdue
          .slice(0, 5)
          .map((t) => `  - ${t.title} (due ${t.nextDueAt.split('T')[0]})`)
          .join('\n');
        sections.push(`Overdue tasks:\n${overdueList}`);
      }
      if (upcoming.length > 0) {
        const upcomingList = upcoming
          .slice(0, 5)
          .map((t) => `  - ${t.title} (due ${t.nextDueAt.split('T')[0]})`)
          .join('\n');
        sections.push(`Upcoming this week:\n${upcomingList}`);
      }
    } catch (error) {
      logger.warn('Failed to gather maintenance context:', error);
    }

    try {
      const assets = this.inventoryService.list();
      sections.push(`Inventory: ${assets.length} tracked assets`);
    } catch (error) {
      logger.warn('Failed to gather inventory context:', error);
    }

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const budgetSummary = this.budgetService.getSummary(currentMonth);
      sections.push(
        `Budget (${currentMonth}): Income $${(budgetSummary.totalIncome / 100).toFixed(2)}, Expenses $${(budgetSummary.totalExpenses / 100).toFixed(2)}, Balance $${(budgetSummary.balance / 100).toFixed(2)}`
      );
    } catch (error) {
      logger.warn('Failed to gather budget context:', error);
    }

    try {
      const vendors = this.vendorService.list();
      sections.push(`Vendors: ${vendors.length} service providers on file`);
    } catch (error) {
      logger.warn('Failed to gather vendor context:', error);
    }

    return sections.length > 0 ? sections.join('\n') : 'No household data available yet.';
  }
}
