# Phase 1: Phase 1: Home Research Agent Prompts

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Update agent prompt templates in libs/prompts/ to add a home research mode. When a board task is NOT tagged as a code/dev task, the agent should: (1) Research the topic using web search and available context, (2) Produce a structured report with options, pros/cons, price ranges, recommendations, (3) NOT attempt to write code or modify files. Update agent-definitions.ts to include a 'home-research' agent type. The default agent behavior for new board tasks should be research-and-report. Update the board task creation dialog to default to 'research' type tasks with example placeholders like 'Research best smart thermostat for 2000 sq ft house'.

---

## Tasks

---

## Deliverables

- [ ] Code implemented and working
- [ ] Tests passing
- [ ] Documentation updated

---

## Handoff Checklist

Before marking Phase 1 complete:

- [ ] All tasks complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Team notified

**Next**: Phase 2
