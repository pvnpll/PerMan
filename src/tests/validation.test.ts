import { describe, it, expect } from 'vitest';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateCategorySchema,
  CreateProjectSchema,
  SearchTasksSchema,
} from '../lib/validation';

describe('Validation Schemas', () => {
  it('validates valid task creation', () => {
    const valid = {
      title: 'Fix the water logging API',
      priority: 'HIGH',
      status: 'NEXT',
      timezone: 'Asia/Kolkata',
    };
    const parsed = CreateTaskSchema.parse(valid);
    expect(parsed.title).toBe('Fix the water logging API');
    expect(parsed.priority).toBe('HIGH');
    expect(parsed.status).toBe('NEXT');
  });

  it('rejects empty task title', () => {
    expect(() => {
      CreateTaskSchema.parse({ title: '' });
    }).toThrow();
  });

  it('allows optional category_id, project_id, and merchant', () => {
    const parsed = CreateTaskSchema.parse({
      title: 'Buy noise cancelling headphones',
      merchant: 'Amazon',
      estimated_amount: 199.99,
      category_id: '11111111-1111-4111-a111-111111111111',
    });
    expect(parsed.merchant).toBe('Amazon');
    expect(parsed.estimated_amount).toBe(199.99);
    expect(parsed.category_id).toBe('11111111-1111-4111-a111-111111111111');
  });

  it('validates search task filters with pagination defaults', () => {
    const search = SearchTasksSchema.parse({
      query: 'Calflow',
      status: 'SCHEDULED',
    });
    expect(search.limit).toBe(50);
    expect(search.offset).toBe(0);
    expect(search.sort_by).toBe('created_at');
    expect(search.sort_direction).toBe('desc');
  });

  it('validates project creation with default ACTIVE status', () => {
    const project = CreateProjectSchema.parse({
      name: 'Calflow Mobile App',
      color: '#10B981',
    });
    expect(project.status).toBe('ACTIVE');
  });

  it('validates category creation requiring name', () => {
    expect(() => {
      CreateCategorySchema.parse({ name: '' });
    }).toThrow();
  });
});
