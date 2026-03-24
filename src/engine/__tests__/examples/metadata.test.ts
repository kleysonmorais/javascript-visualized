import { describe, it, expect } from 'vitest';
import { CODE_EXAMPLES } from '@/constants/examples';

describe('Example metadata', () => {
  it('all examples have unique IDs', () => {
    const ids = CODE_EXAMPLES.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all examples have a title', () => {
    CODE_EXAMPLES.forEach((example) => {
      expect(example.title).toBeDefined();
      expect(example.title.length).toBeGreaterThan(0);
    });
  });

  it('all examples have a description', () => {
    CODE_EXAMPLES.forEach((example) => {
      expect(example.description).toBeDefined();
      expect(example.description.length).toBeGreaterThan(0);
    });
  });

  it('all examples have a valid category', () => {
    const validCategories = [
      'sync',
      'async',
      'promise',
      'advanced',
      'closures',
    ];
    CODE_EXAMPLES.forEach((example) => {
      expect(validCategories).toContain(example.category);
    });
  });

  it('sync examples do not use setTimeout/Promise/async', () => {
    const syncExamples = CODE_EXAMPLES.filter((e) => e.category === 'sync');
    syncExamples.forEach((example) => {
      expect(example.code).not.toContain('setTimeout');
      expect(example.code).not.toContain('Promise');
      expect(example.code).not.toMatch(/\basync\b/);
      expect(example.code).not.toMatch(/\bawait\b/);
    });
  });

  it('async examples use at least one async feature', () => {
    const asyncExamples = CODE_EXAMPLES.filter((e) => e.category === 'async');
    asyncExamples.forEach((example) => {
      const hasAsync =
        example.code.includes('setTimeout') ||
        example.code.includes('Promise') ||
        example.code.includes('async') ||
        example.code.includes('fetch');
      expect(hasAsync).toBe(true);
    });
  });
});
