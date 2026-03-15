/**
 * Unit tests for level-calculator utility
 */

import { describe, it, expect } from 'vitest';
import { calculateLevel, xpForLevel } from '../src/utils/level-calculator.js';

describe('calculateLevel', () => {
  it('returns level 1 at 0 XP', () => {
    const result = calculateLevel(0);
    expect(result.level).toBe(1);
    expect(result.title).toBe('Homeowner');
    expect(result.xpToNextLevel).toBe(500);
  });

  it('returns level 1 just below threshold', () => {
    const result = calculateLevel(499);
    expect(result.level).toBe(1);
    expect(result.xpToNextLevel).toBe(1);
  });

  it('returns level 2 at exactly 500 XP', () => {
    const result = calculateLevel(500);
    expect(result.level).toBe(2);
    expect(result.title).toBe('Handyman');
    expect(result.xpToNextLevel).toBe(1000);
  });

  it('returns level 3 at 1500 XP', () => {
    const result = calculateLevel(1500);
    expect(result.level).toBe(3);
    expect(result.title).toBe('Fixer');
  });

  it('returns level 4 at 3500 XP', () => {
    const result = calculateLevel(3500);
    expect(result.level).toBe(4);
  });

  it('returns level 5 at 7000 XP', () => {
    const result = calculateLevel(7000);
    expect(result.level).toBe(5);
    expect(result.title).toBe('Home Pro');
  });

  it('returns level 6 at 12000 XP', () => {
    const result = calculateLevel(12000);
    expect(result.level).toBe(6);
  });

  it('returns level 7 at 20000 XP', () => {
    const result = calculateLevel(20000);
    expect(result.level).toBe(7);
  });

  it('returns level 8 at 32000 XP', () => {
    const result = calculateLevel(32000);
    expect(result.level).toBe(8);
  });

  it('returns level 9 at 50000 XP', () => {
    const result = calculateLevel(50000);
    expect(result.level).toBe(9);
  });

  it('returns level 10 at 75000 XP', () => {
    const result = calculateLevel(75000);
    expect(result.level).toBe(10);
    expect(result.title).toBe('Home Legend');
    expect(result.xpToNextLevel).toBe(0);
  });

  it('returns level 10 for XP beyond 75000 (capped)', () => {
    const result = calculateLevel(999999);
    expect(result.level).toBe(10);
    expect(result.xpToNextLevel).toBe(0);
  });

  it('xpToNextLevel is correct mid-level', () => {
    // At 1000 XP we are level 2 (500 threshold), next is level 3 at 1500
    const result = calculateLevel(1000);
    expect(result.level).toBe(2);
    expect(result.xpToNextLevel).toBe(500);
  });
});

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('returns correct thresholds', () => {
    expect(xpForLevel(2)).toBe(500);
    expect(xpForLevel(5)).toBe(7000);
    expect(xpForLevel(10)).toBe(75000);
  });

  it('returns 0 for level below 1', () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it('returns Infinity for level beyond 10', () => {
    expect(xpForLevel(11)).toBe(Infinity);
  });
});
