import { db } from '../db';
import { scheduleTemplatesTable } from '../db/schema';
import { type CreateScheduleTemplateInput, type ScheduleTemplate } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new schedule template
 * Handles schedule template creation with name and description
 */
export const createScheduleTemplate = async (input: CreateScheduleTemplateInput): Promise<ScheduleTemplate> => {
  try {
    const result = await db.insert(scheduleTemplatesTable)
      .values({
        name: input.name,
        description: input.description
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Schedule template creation failed:', error);
    throw error;
  }
};

/**
 * Get all schedule templates
 * Returns list of all schedule templates in the system
 */
export const getScheduleTemplates = async (): Promise<ScheduleTemplate[]> => {
  try {
    const result = await db.select()
      .from(scheduleTemplatesTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch schedule templates:', error);
    throw error;
  }
};

/**
 * Get schedule template by ID
 * Returns specific schedule template details by ID
 */
export const getScheduleTemplateById = async (id: number): Promise<ScheduleTemplate | null> => {
  try {
    const result = await db.select()
      .from(scheduleTemplatesTable)
      .where(eq(scheduleTemplatesTable.id, id))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Failed to fetch schedule template by ID:', error);
    throw error;
  }
};

/**
 * Update schedule template information
 * Updates existing schedule template record with new data
 */
export const updateScheduleTemplate = async (input: { id: number; name?: string; description?: string }): Promise<ScheduleTemplate> => {
  try {
    const updateData: Partial<typeof scheduleTemplatesTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await db.update(scheduleTemplatesTable)
      .set(updateData)
      .where(eq(scheduleTemplatesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Schedule template with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Schedule template update failed:', error);
    throw error;
  }
};

/**
 * Delete schedule template by ID
 * Removes schedule template record from database
 */
export const deleteScheduleTemplate = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(scheduleTemplatesTable)
      .where(eq(scheduleTemplatesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Schedule template deletion failed:', error);
    throw error;
  }
};