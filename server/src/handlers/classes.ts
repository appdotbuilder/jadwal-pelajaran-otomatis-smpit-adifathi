import { db } from '../db';
import { classesTable, academicYearsTable } from '../db/schema';
import { type CreateClassInput, type UpdateClassInput, type Class } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new class
 * Handles class creation with grade level, rombel, name, and academic year association
 */
export const createClass = async (input: CreateClassInput): Promise<Class> => {
  try {
    // Verify academic year exists
    const academicYear = await db.select()
      .from(academicYearsTable)
      .where(eq(academicYearsTable.id, input.academic_year_id))
      .execute();

    if (academicYear.length === 0) {
      throw new Error(`Academic year with ID ${input.academic_year_id} not found`);
    }

    // Insert class record
    const result = await db.insert(classesTable)
      .values({
        grade_level: input.grade_level,
        rombel: input.rombel,
        class_name: input.class_name,
        academic_year_id: input.academic_year_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Class creation failed:', error);
    throw error;
  }
};

/**
 * Get all classes
 * Returns list of all classes in the system
 */
export const getClasses = async (): Promise<Class[]> => {
  try {
    const results = await db.select()
      .from(classesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    throw error;
  }
};

/**
 * Get classes by academic year
 * Returns classes for specific academic year
 */
export const getClassesByAcademicYear = async (academicYearId: number): Promise<Class[]> => {
  try {
    const results = await db.select()
      .from(classesTable)
      .where(eq(classesTable.academic_year_id, academicYearId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch classes by academic year:', error);
    throw error;
  }
};

/**
 * Get class by ID
 * Returns specific class details by ID
 */
export const getClassById = async (id: number): Promise<Class | null> => {
  try {
    const results = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch class by ID:', error);
    throw error;
  }
};

/**
 * Update class information
 * Updates existing class record with new data
 */
export const updateClass = async (input: UpdateClassInput): Promise<Class> => {
  try {
    // Check if class exists
    const existingClass = await getClassById(input.id);
    if (!existingClass) {
      throw new Error(`Class with ID ${input.id} not found`);
    }

    // If academic_year_id is being updated, verify it exists
    if (input.academic_year_id && input.academic_year_id !== existingClass.academic_year_id) {
      const academicYear = await db.select()
        .from(academicYearsTable)
        .where(eq(academicYearsTable.id, input.academic_year_id))
        .execute();

      if (academicYear.length === 0) {
        throw new Error(`Academic year with ID ${input.academic_year_id} not found`);
      }
    }

    // Prepare update data
    const updateData: Partial<typeof classesTable.$inferInsert> = {};
    if (input.grade_level !== undefined) updateData.grade_level = input.grade_level;
    if (input.rombel !== undefined) updateData.rombel = input.rombel;
    if (input.class_name !== undefined) updateData.class_name = input.class_name;
    if (input.academic_year_id !== undefined) updateData.academic_year_id = input.academic_year_id;

    // Update class record
    const result = await db.update(classesTable)
      .set(updateData)
      .where(eq(classesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Class update failed:', error);
    throw error;
  }
};

/**
 * Delete class by ID
 * Removes class record from database
 */
export const deleteClass = async (id: number): Promise<boolean> => {
  try {
    // Check if class exists
    const existingClass = await getClassById(id);
    if (!existingClass) {
      throw new Error(`Class with ID ${id} not found`);
    }

    // Delete class record
    await db.delete(classesTable)
      .where(eq(classesTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Class deletion failed:', error);
    throw error;
  }
};