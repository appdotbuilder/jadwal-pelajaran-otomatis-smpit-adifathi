import { db } from '../db';
import { timeSlotsTable, scheduleTemplatesTable } from '../db/schema';
import { type CreateTimeSlotInput, type TimeSlot } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create a new time slot
 * Handles time slot creation with template, day, JP number, times, duration, and slot type
 */
export const createTimeSlot = async (input: CreateTimeSlotInput): Promise<TimeSlot> => {
  try {
    // Verify that the template exists
    const template = await db.select()
      .from(scheduleTemplatesTable)
      .where(eq(scheduleTemplatesTable.id, input.template_id))
      .execute();

    if (template.length === 0) {
      throw new Error(`Schedule template with id ${input.template_id} not found`);
    }

    // Insert time slot record
    const result = await db.insert(timeSlotsTable)
      .values({
        template_id: input.template_id,
        day_of_week: input.day_of_week,
        jp_number: input.jp_number,
        start_time: input.start_time,
        end_time: input.end_time,
        duration: input.duration,
        slot_type: input.slot_type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Time slot creation failed:', error);
    throw error;
  }
};

/**
 * Get time slots by template ID
 * Returns time slots for specific schedule template
 */
export const getTimeSlotsByTemplate = async (templateId: number): Promise<TimeSlot[]> => {
  try {
    const result = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.template_id, templateId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get time slots by template:', error);
    throw error;
  }
};

/**
 * Get time slots by template and day
 * Returns time slots for specific template and day of week
 */
export const getTimeSlotsByTemplateAndDay = async (templateId: number, dayOfWeek: number): Promise<TimeSlot[]> => {
  try {
    const result = await db.select()
      .from(timeSlotsTable)
      .where(and(
        eq(timeSlotsTable.template_id, templateId),
        eq(timeSlotsTable.day_of_week, dayOfWeek)
      ))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get time slots by template and day:', error);
    throw error;
  }
};

/**
 * Get time slot by ID
 * Returns specific time slot details by ID
 */
export const getTimeSlotById = async (id: number): Promise<TimeSlot | null> => {
  try {
    const result = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to get time slot by ID:', error);
    throw error;
  }
};

/**
 * Update time slot information
 * Updates existing time slot record with new data
 */
export const updateTimeSlot = async (input: { id: number } & Partial<CreateTimeSlotInput>): Promise<TimeSlot> => {
  try {
    // Check if time slot exists
    const existing = await getTimeSlotById(input.id);
    if (!existing) {
      throw new Error(`Time slot with id ${input.id} not found`);
    }

    // If template_id is being updated, verify the new template exists
    if (input.template_id && input.template_id !== existing.template_id) {
      const template = await db.select()
        .from(scheduleTemplatesTable)
        .where(eq(scheduleTemplatesTable.id, input.template_id))
        .execute();

      if (template.length === 0) {
        throw new Error(`Schedule template with id ${input.template_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<CreateTimeSlotInput> = {};
    if (input.template_id !== undefined) updateData.template_id = input.template_id;
    if (input.day_of_week !== undefined) updateData.day_of_week = input.day_of_week;
    if (input.jp_number !== undefined) updateData.jp_number = input.jp_number;
    if (input.start_time !== undefined) updateData.start_time = input.start_time;
    if (input.end_time !== undefined) updateData.end_time = input.end_time;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.slot_type !== undefined) updateData.slot_type = input.slot_type;

    // Update time slot record
    const result = await db.update(timeSlotsTable)
      .set(updateData)
      .where(eq(timeSlotsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Time slot update failed:', error);
    throw error;
  }
};

/**
 * Delete time slot by ID
 * Removes time slot record from database
 */
export const deleteTimeSlot = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(timeSlotsTable)
      .where(eq(timeSlotsTable.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Time slot deletion failed:', error);
    throw error;
  }
};

/**
 * Delete all time slots by template ID
 * Removes all time slots for specific template from database
 */
export const deleteTimeSlotsByTemplate = async (templateId: number): Promise<boolean> => {
  try {
    const result = await db.delete(timeSlotsTable)
      .where(eq(timeSlotsTable.template_id, templateId))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Time slots deletion by template failed:', error);
    throw error;
  }
};