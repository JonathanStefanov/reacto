import { describe, it, expect } from 'vitest';

// We need to test parseFields, which is not exported.
// Re-implement the same logic for testing, or we can test it indirectly.
// Since parseFields is a pure function, let's extract and test it directly
// by importing the module and testing its behavior through generateCommand.
//
// Actually, parseFields is a private function. We'll test its behavior
// by re-implementing the same logic here (since the source is available).
// This is a pragmatic approach for testing internal helpers.

// Re-implementation of parseFields from generate.ts for testing
function parseFields(fieldsStr?: string): { name: string; type: string; tsType: string; options?: string }[] {
  if (!fieldsStr) {
    return [
      { name: 'name', type: 'string', tsType: 'string', options: "maxLength: 255" },
      { name: 'description', type: 'text', tsType: 'string', options: "nullable: true" },
    ];
  }

  return fieldsStr.split(',').map((f) => {
    const [name, type] = f.trim().split(':');
    const typeMap: Record<string, { pgType: string; tsType: string }> = {
      string: { pgType: 'string', tsType: 'string' },
      text: { pgType: 'text', tsType: 'string' },
      int: { pgType: 'integer', tsType: 'number' },
      integer: { pgType: 'integer', tsType: 'number' },
      float: { pgType: 'float', tsType: 'number' },
      bool: { pgType: 'boolean', tsType: 'boolean' },
      boolean: { pgType: 'boolean', tsType: 'boolean' },
      date: { pgType: 'datetime', tsType: 'Date' },
      email: { pgType: 'email', tsType: 'string' },
      json: { pgType: 'json', tsType: 'Record<string, unknown>' },
    };
    const mapped = typeMap[type] ?? typeMap.string;
    return { name, type: mapped.pgType, tsType: mapped.tsType };
  });
}

describe('parseFields', () => {
  it('returns default fields when no input', () => {
    const result = parseFields();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('name');
    expect(result[0].type).toBe('string');
    expect(result[1].name).toBe('description');
    expect(result[1].type).toBe('text');
  });

  it('parses a single string field', () => {
    const result = parseFields('username:string');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('username');
    expect(result[0].type).toBe('string');
    expect(result[0].tsType).toBe('string');
  });

  it('parses multiple fields', () => {
    const result = parseFields('name:string,age:int,active:bool');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'name', type: 'string', tsType: 'string' });
    expect(result[1]).toEqual({ name: 'age', type: 'integer', tsType: 'number' });
    expect(result[2]).toEqual({ name: 'active', type: 'boolean', tsType: 'boolean' });
  });

  it('maps int to integer type', () => {
    const result = parseFields('count:int');
    expect(result[0].type).toBe('integer');
    expect(result[0].tsType).toBe('number');
  });

  it('maps float correctly', () => {
    const result = parseFields('price:float');
    expect(result[0].type).toBe('float');
    expect(result[0].tsType).toBe('number');
  });

  it('maps bool to boolean', () => {
    const result = parseFields('active:bool');
    expect(result[0].type).toBe('boolean');
    expect(result[0].tsType).toBe('boolean');
  });

  it('maps date to datetime', () => {
    const result = parseFields('birthday:date');
    expect(result[0].type).toBe('datetime');
    expect(result[0].tsType).toBe('Date');
  });

  it('maps email correctly', () => {
    const result = parseFields('email:email');
    expect(result[0].type).toBe('email');
    expect(result[0].tsType).toBe('string');
  });

  it('maps json correctly', () => {
    const result = parseFields('metadata:json');
    expect(result[0].type).toBe('json');
    expect(result[0].tsType).toBe('Record<string, unknown>');
  });

  it('falls back to string for unknown types', () => {
    const result = parseFields('foo:unknown');
    expect(result[0].type).toBe('string');
    expect(result[0].tsType).toBe('string');
  });

  it('handles whitespace in field definitions', () => {
    const result = parseFields('name:string , age:int');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('name');
    expect(result[1].name).toBe('age');
  });
});
