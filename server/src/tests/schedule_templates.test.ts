import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { scheduleTemplatesTable } from '../db/schema';
import { type CreateScheduleTemplateInput } from '../schema';
import { 
  createScheduleTemplate, 
  getScheduleTemplates, 
  getScheduleTemplateById, 
  updateScheduleTemplate, 
  deleteScheduleTemplate 
} from '../handlers/schedule_templates';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateScheduleTemplateInput = {
  name: 'Test Schedule Template',
  description: 'A template for testing purposes'
};

const secondTestInput: CreateScheduleTemplateInput = {
  name: 'Another Test Template',
  description: 'Second template for testing'
};

describe('Schedule Template Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createScheduleTemplate', () => {
    it('should create a schedule template', async () => {
      const result = await createScheduleTemplate(testInput);

      expect(result.name).toEqual('Test Schedule Template');
      expect(result.description).toEqual('A template for testing purposes');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save schedule template to database', async () => {
      const result = await createScheduleTemplate(testInput);

      const templates = await db.select()
        .from(scheduleTemplatesTable)
        .where(eq(scheduleTemplatesTable.id, result.id))
        .execute();

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toEqual('Test Schedule Template');
      expect(templates[0].description).toEqual('A template for testing purposes');
      expect(templates[0].created_at).toBeInstanceOf(Date);
      expect(templates[0].updated_at).toBeInstanceOf(Date);
    });

    it('should handle special characters in name and description', async () => {
      const specialInput: CreateScheduleTemplateInput = {
        name: 'Template with "quotes" & symbols',
        description: 'Description with special chars: áéíóú & symbols!'
      };

      const result = await createScheduleTemplate(specialInput);

      expect(result.name).toEqual('Template with "quotes" & symbols');
      expect(result.description).toEqual('Description with special chars: áéíóú & symbols!');
    });
  });

  describe('getScheduleTemplates', () => {
    it('should return empty array when no templates exist', async () => {
      const result = await getScheduleTemplates();

      expect(result).toEqual([]);
    });

    it('should return all schedule templates', async () => {
      const template1 = await createScheduleTemplate(testInput);
      const template2 = await createScheduleTemplate(secondTestInput);

      const result = await getScheduleTemplates();

      expect(result).toHaveLength(2);
      expect(result.find(t => t.id === template1.id)).toBeDefined();
      expect(result.find(t => t.id === template2.id)).toBeDefined();
      expect(result.find(t => t.name === 'Test Schedule Template')).toBeDefined();
      expect(result.find(t => t.name === 'Another Test Template')).toBeDefined();
    });

    it('should return templates with all required fields', async () => {
      await createScheduleTemplate(testInput);

      const result = await getScheduleTemplates();

      expect(result).toHaveLength(1);
      const template = result[0];
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.created_at).toBeInstanceOf(Date);
      expect(template.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getScheduleTemplateById', () => {
    it('should return null when template does not exist', async () => {
      const result = await getScheduleTemplateById(999);

      expect(result).toBeNull();
    });

    it('should return schedule template by ID', async () => {
      const created = await createScheduleTemplate(testInput);

      const result = await getScheduleTemplateById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Schedule Template');
      expect(result!.description).toEqual('A template for testing purposes');
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return specific template among multiple', async () => {
      const template1 = await createScheduleTemplate(testInput);
      const template2 = await createScheduleTemplate(secondTestInput);

      const result = await getScheduleTemplateById(template2.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(template2.id);
      expect(result!.name).toEqual('Another Test Template');
      expect(result!.description).toEqual('Second template for testing');
    });
  });

  describe('updateScheduleTemplate', () => {
    it('should update schedule template name only', async () => {
      const created = await createScheduleTemplate(testInput);

      const result = await updateScheduleTemplate({
        id: created.id,
        name: 'Updated Template Name'
      });

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Template Name');
      expect(result.description).toEqual('A template for testing purposes'); // unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update schedule template description only', async () => {
      const created = await createScheduleTemplate(testInput);

      const result = await updateScheduleTemplate({
        id: created.id,
        description: 'Updated description content'
      });

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Test Schedule Template'); // unchanged
      expect(result.description).toEqual('Updated description content');
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update both name and description', async () => {
      const created = await createScheduleTemplate(testInput);

      const result = await updateScheduleTemplate({
        id: created.id,
        name: 'Completely New Name',
        description: 'Completely new description'
      });

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Completely New Name');
      expect(result.description).toEqual('Completely new description');
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should save updates to database', async () => {
      const created = await createScheduleTemplate(testInput);

      await updateScheduleTemplate({
        id: created.id,
        name: 'Database Updated Name',
        description: 'Database updated description'
      });

      const fromDb = await db.select()
        .from(scheduleTemplatesTable)
        .where(eq(scheduleTemplatesTable.id, created.id))
        .execute();

      expect(fromDb).toHaveLength(1);
      expect(fromDb[0].name).toEqual('Database Updated Name');
      expect(fromDb[0].description).toEqual('Database updated description');
    });

    it('should throw error when template does not exist', async () => {
      await expect(updateScheduleTemplate({
        id: 999,
        name: 'Non-existent Template'
      })).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteScheduleTemplate', () => {
    it('should return false when template does not exist', async () => {
      const result = await deleteScheduleTemplate(999);

      expect(result).toBe(false);
    });

    it('should delete schedule template and return true', async () => {
      const created = await createScheduleTemplate(testInput);

      const result = await deleteScheduleTemplate(created.id);

      expect(result).toBe(true);

      // Verify deletion from database
      const fromDb = await db.select()
        .from(scheduleTemplatesTable)
        .where(eq(scheduleTemplatesTable.id, created.id))
        .execute();

      expect(fromDb).toHaveLength(0);
    });

    it('should only delete specified template', async () => {
      const template1 = await createScheduleTemplate(testInput);
      const template2 = await createScheduleTemplate(secondTestInput);

      const result = await deleteScheduleTemplate(template1.id);

      expect(result).toBe(true);

      // Verify only the specified template was deleted
      const allTemplates = await getScheduleTemplates();
      expect(allTemplates).toHaveLength(1);
      expect(allTemplates[0].id).toEqual(template2.id);
      expect(allTemplates[0].name).toEqual('Another Test Template');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete CRUD workflow', async () => {
      // Create
      const created = await createScheduleTemplate({
        name: 'CRUD Test Template',
        description: 'Testing full CRUD operations'
      });

      expect(created.name).toEqual('CRUD Test Template');

      // Read (by ID)
      const retrieved = await getScheduleTemplateById(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toEqual('CRUD Test Template');

      // Update
      const updated = await updateScheduleTemplate({
        id: created.id,
        name: 'CRUD Updated Template',
        description: 'Updated through CRUD test'
      });

      expect(updated.name).toEqual('CRUD Updated Template');
      expect(updated.description).toEqual('Updated through CRUD test');

      // Read all (should include updated template)
      const allTemplates = await getScheduleTemplates();
      expect(allTemplates).toHaveLength(1);
      expect(allTemplates[0].name).toEqual('CRUD Updated Template');

      // Delete
      const deleted = await deleteScheduleTemplate(created.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = await getScheduleTemplates();
      expect(afterDelete).toHaveLength(0);
    });

    it('should handle multiple templates with different operations', async () => {
      // Create multiple templates
      const template1 = await createScheduleTemplate({
        name: 'Template One',
        description: 'First template'
      });

      const template2 = await createScheduleTemplate({
        name: 'Template Two',
        description: 'Second template'
      });

      const template3 = await createScheduleTemplate({
        name: 'Template Three',
        description: 'Third template'
      });

      // Verify all created
      let allTemplates = await getScheduleTemplates();
      expect(allTemplates).toHaveLength(3);

      // Update one template
      await updateScheduleTemplate({
        id: template2.id,
        name: 'Modified Template Two'
      });

      // Delete another template
      await deleteScheduleTemplate(template3.id);

      // Verify final state
      allTemplates = await getScheduleTemplates();
      expect(allTemplates).toHaveLength(2);

      const names = allTemplates.map(t => t.name).sort();
      expect(names).toEqual(['Modified Template Two', 'Template One']);
    });
  });
});