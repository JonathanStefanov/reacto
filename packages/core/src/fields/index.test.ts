import { describe, it, expect } from 'vitest';
import { fieldTypeToPgType, fieldToColumn, columnToSql } from './index.js';

describe('Fields', () => {
  describe('fieldTypeToPgType', () => {
    it('maps string to VARCHAR', () => {
      expect(fieldTypeToPgType('string')).toBe('VARCHAR(255)');
      expect(fieldTypeToPgType('string', 100)).toBe('VARCHAR(100)');
    });

    it('maps text to TEXT', () => {
      expect(fieldTypeToPgType('text')).toBe('TEXT');
    });

    it('maps integer to INTEGER', () => {
      expect(fieldTypeToPgType('integer')).toBe('INTEGER');
    });

    it('maps boolean to BOOLEAN', () => {
      expect(fieldTypeToPgType('boolean')).toBe('BOOLEAN');
    });

    it('maps datetime to TIMESTAMPTZ', () => {
      expect(fieldTypeToPgType('datetime')).toBe('TIMESTAMPTZ');
    });

    it('maps json to JSONB', () => {
      expect(fieldTypeToPgType('json')).toBe('JSONB');
    });

    it('maps email to VARCHAR(254)', () => {
      expect(fieldTypeToPgType('email')).toBe('VARCHAR(254)');
    });

    it('maps decimal with precision', () => {
      expect(fieldTypeToPgType('decimal', undefined, 10, 2)).toBe('DECIMAL(10,2)');
    });
  });

  describe('fieldToColumn', () => {
    it('converts a field definition to column definition', () => {
      const col = fieldToColumn({
        name: 'username',
        propertyKey: 'username',
        type: 'string',
        maxLength: 150,
        unique: true,
      });

      expect(col.name).toBe('username');
      expect(col.type).toBe('VARCHAR(150)');
      expect(col.unique).toBe(true);
    });
  });

  describe('columnToSql', () => {
    it('generates SQL for a basic column', () => {
      const sql = columnToSql({
        name: 'username',
        type: 'VARCHAR(150)',
        nullable: false,
        unique: true,
      });

      expect(sql).toContain('username');
      expect(sql).toContain('VARCHAR(150)');
      expect(sql).toContain('NOT NULL');
      expect(sql).toContain('UNIQUE');
    });

    it('generates SQL for a primary key', () => {
      const sql = columnToSql({
        name: 'id',
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true,
      });

      expect(sql).toContain('id');
      expect(sql).toContain('INTEGER');
      expect(sql).toContain('PRIMARY KEY');
      expect(sql).toContain('GENERATED ALWAYS AS IDENTITY');
    });
  });
});
