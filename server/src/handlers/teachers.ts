import { db } from '../db';
import { teachersTable } from '../db/schema';
import { type CreateTeacherInput, type UpdateTeacherInput, type Teacher } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new teacher record
 * Handles teacher master data creation including name, NIP/NUPTK, TMT, and education background
 */
export const createTeacher = async (input: CreateTeacherInput): Promise<Teacher> => {
  try {
    // Insert teacher record
    const result = await db.insert(teachersTable)
      .values({
        name: input.name,
        nip_nuptk: input.nip_nuptk,
        tmt: input.tmt,
        education: input.education
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Teacher creation failed:', error);
    throw error;
  }
};

/**
 * Get all teachers
 * Returns list of all teachers in the system
 */
export const getTeachers = async (): Promise<Teacher[]> => {
  try {
    const results = await db.select()
      .from(teachersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch teachers:', error);
    throw error;
  }
};

/**
 * Get teacher by ID
 * Returns specific teacher details by ID
 */
export const getTeacherById = async (id: number): Promise<Teacher | null> => {
  try {
    const results = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch teacher by ID:', error);
    throw error;
  }
};

/**
 * Update teacher information
 * Updates existing teacher record with new data
 */
export const updateTeacher = async (input: UpdateTeacherInput): Promise<Teacher> => {
  try {
    const { id, ...updateData } = input;
    
    const result = await db.update(teachersTable)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(teachersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Teacher with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Teacher update failed:', error);
    throw error;
  }
};

/**
 * Delete teacher by ID
 * Removes teacher record from database
 */
export const deleteTeacher = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(teachersTable)
      .where(eq(teachersTable.id, id))
      .execute();

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Teacher deletion failed:', error);
    throw error;
  }
};