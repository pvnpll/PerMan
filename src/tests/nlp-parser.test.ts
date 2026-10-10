import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageTask } from '../lib/nlp-parser';

describe('Natural Language Task Parser', () => {
  it('parses "Fix the Calflow water logging API tomorrow."', () => {
    const res = parseNaturalLanguageTask('Fix the Calflow water logging API tomorrow.');
    expect(res.projectName).toBe('Calflow');
    expect(res.dueDate).toBeDefined();
    expect(res.title.toLowerCase()).toContain('calflow');
  });

  it('parses "Buy headphones from Amazon next month."', () => {
    const res = parseNaturalLanguageTask('Buy headphones from Amazon next month.');
    expect(res.merchant).toBe('Amazon');
    expect(res.categoryName).toBe('Shopping & Purchases');
    expect(res.dueDate).toBeDefined();
  });

  it('parses "Pay my bill on the 15th."', () => {
    const res = parseNaturalLanguageTask('Pay my bill on the 15th.');
    expect(res.categoryName).toBe('Finances');
    expect(res.dueDate).toBeDefined();
  });

  it('parses "Research remote MCP authentication."', () => {
    const res = parseNaturalLanguageTask('Research remote MCP authentication.');
    expect(res.title).toBe('Research remote MCP authentication.');
    expect(res.priority).toBe('MEDIUM');
    expect(res.status).toBe('INBOX');
  });

  it('parses "Explore an AI blog idea sometime."', () => {
    const res = parseNaturalLanguageTask('Explore an AI blog idea sometime.');
    expect(res.categoryName).toBe('Content & Creativity');
    expect(res.priority).toBe('LOW');
  });

  it('parses "Remind me every Monday at 9 AM to review my tasks."', () => {
    const res = parseNaturalLanguageTask('Remind me every Monday at 9 AM to review my tasks.');
    expect(res.recurrenceRule?.frequency).toBe('WEEKLY');
    expect(res.reminderTime).toBeDefined();
    expect(res.title.toLowerCase()).toContain('review my tasks');
  });

  it('extracts URLs and estimated amounts', () => {
    const res = parseNaturalLanguageTask('Buy mechanical keyboard for $120 from https://keychron.com');
    expect(res.url).toBe('https://keychron.com');
    expect(res.estimatedAmount).toBe(120);
  });
});
