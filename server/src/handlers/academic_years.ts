import { db } from '../db';
import { academicYearsTable } from '../db/schema';
import { type CreateAcademicYearInput, type UpdateAcademicYearInput, type AcademicYear } from '../schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Create a new academic year
 * Handles academic year creation with year, semester, curriculum, and time allocation
 */
export const createAcademicYear = async (input: CreateAcademicYearInput): Promise<AcademicYear> => {
  try {
    // Insert academic year record
    const result = await db.insert(academicYearsTable)
      .values({
        year: input.year,
        semester: input.semester,
        curriculum: input.curriculum,
        total_time_allocation: input.total_time_allocation,
        is_active: input.is_active || false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Academic year creation failed:', error);
    throw error;
  }
};

/**
 * Get all academic years
 * Returns list of all academic years in the system
 */
export const getAcademicYears = async (): Promise<AcademicYear[]> => {
  try {
    const result = await db.select()
      .from(academicYearsTable)
      .orderBy(academicYearsTable.year, academicYearsTable.semester)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch academic years:', error);
    throw error;
  }
};

/**
 * Get academic year by ID
 * Returns specific academic year details by ID
 */
export const getAcademicYearById = async (id: number): Promise<AcademicYear | null> => {
  try {
    const result = await db.select()
      .from(academicYearsTable)
      .where(eq(academicYearsTable.id, id))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Failed to fetch academic year by ID:', error);
    throw error;
  }
};

/**
 * Get active academic year
 * Returns the currently active academic year
 */
export const getActiveAcademicYear = async (): Promise<AcademicYear | null> => {
  try {
    const result = await db.select()
      .from(academicYearsTable)
      .where(eq(academicYearsTable.is_active, true))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Failed to fetch active academic year:', error);
    throw error;
  }
};

/**
 * Update academic year information
 * Updates existing academic year record with new data
 */
export const updateAcademicYear = async (input: UpdateAcademicYearInput): Promise<AcademicYear> => {
  try {
    // Extract ID and prepare update data
    const { id, ...updateData } = input;

    const result = await db.update(academicYearsTable)
      .set({
        ...updateData,
        updated_at: sql`NOW()`
      })
      .where(eq(academicYearsTable.id, id))
      .returning()
      .execute();

    if (!result[0]) {
      throw new Error(`Academic year with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Academic year update failed:', error);
    throw error;
  }
};

/**
 * Set active academic year
 * Sets specific academic year as active (deactivates others)
 */
export const setActiveAcademicYear = async (id: number): Promise<AcademicYear> => {
  try {
    // Start a transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // First, deactivate all academic years
      await tx.update(academicYearsTable)
        .set({ 
          is_active: false,
          updated_at: sql`NOW()`
        })
        .execute();

      // Then activate the specified academic year
      await tx.update(academicYearsTable)
        .set({ 
          is_active: true,
          updated_at: sql`NOW()`
        })
        .where(eq(academicYearsTable.id, id))
        .execute();
    });

    // Return the updated academic year
    const result = await db.select()
      .from(academicYearsTable)
      .where(eq(academicYearsTable.id, id))
      .execute();

    if (!result[0]) {
      throw new Error(`Academic year with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to set active academic year:', error);
    throw error;
  }
};

/**
 * Delete academic year by ID
 * Removes academic year record from database
 */
export const deleteAcademicYear = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(academicYearsTable)
      .where(eq(academicYearsTable.id, id))
      .returning({ id: academicYearsTable.id })
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Academic year deletion failed:', error);
    throw error;
  }
};