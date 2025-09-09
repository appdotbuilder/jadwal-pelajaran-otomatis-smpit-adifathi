import { db } from '../db';
import { jtmAssignmentsTable, teachersTable, subjectsTable, classesTable, academicYearsTable } from '../db/schema';
import { type CreateJtmAssignmentInput, type JtmAssignment } from '../schema';
import { eq, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

/**
 * Create a new JTM assignment
 * Handles JTM assignment creation linking teacher, subject, class, and hours for specific academic year
 */
export const createJtmAssignment = async (input: CreateJtmAssignmentInput): Promise<JtmAssignment> => {
  try {
    // Verify that referenced entities exist
    const [academicYear, teacher, subject, classEntity] = await Promise.all([
      db.select().from(academicYearsTable).where(eq(academicYearsTable.id, input.academic_year_id)).execute(),
      db.select().from(teachersTable).where(eq(teachersTable.id, input.teacher_id)).execute(),
      db.select().from(subjectsTable).where(eq(subjectsTable.id, input.subject_id)).execute(),
      db.select().from(classesTable).where(eq(classesTable.id, input.class_id)).execute()
    ]);

    if (academicYear.length === 0) {
      throw new Error(`Academic year with id ${input.academic_year_id} not found`);
    }
    if (teacher.length === 0) {
      throw new Error(`Teacher with id ${input.teacher_id} not found`);
    }
    if (subject.length === 0) {
      throw new Error(`Subject with id ${input.subject_id} not found`);
    }
    if (classEntity.length === 0) {
      throw new Error(`Class with id ${input.class_id} not found`);
    }

    // Insert JTM assignment record
    const result = await db.insert(jtmAssignmentsTable)
      .values({
        academic_year_id: input.academic_year_id,
        teacher_id: input.teacher_id,
        subject_id: input.subject_id,
        class_id: input.class_id,
        allocated_hours: input.allocated_hours
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('JTM assignment creation failed:', error);
    throw error;
  }
};

/**
 * Get JTM assignments by academic year
 * Returns JTM assignments for specific academic year
 */
export const getJtmAssignmentsByAcademicYear = async (academicYearId: number): Promise<JtmAssignment[]> => {
  try {
    const result = await db.select()
      .from(jtmAssignmentsTable)
      .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get JTM assignments by academic year:', error);
    throw error;
  }
};

/**
 * Get JTM assignments by teacher
 * Returns JTM assignments for specific teacher in academic year
 */
export const getJtmAssignmentsByTeacher = async (teacherId: number, academicYearId: number): Promise<JtmAssignment[]> => {
  try {
    const result = await db.select()
      .from(jtmAssignmentsTable)
      .where(and(
        eq(jtmAssignmentsTable.teacher_id, teacherId),
        eq(jtmAssignmentsTable.academic_year_id, academicYearId)
      ))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get JTM assignments by teacher:', error);
    throw error;
  }
};

/**
 * Get JTM assignments by class
 * Returns JTM assignments for specific class in academic year
 */
export const getJtmAssignmentsByClass = async (classId: number, academicYearId: number): Promise<JtmAssignment[]> => {
  try {
    const result = await db.select()
      .from(jtmAssignmentsTable)
      .where(and(
        eq(jtmAssignmentsTable.class_id, classId),
        eq(jtmAssignmentsTable.academic_year_id, academicYearId)
      ))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get JTM assignments by class:', error);
    throw error;
  }
};

/**
 * Get JTM assignment by ID
 * Returns specific JTM assignment details by ID
 */
export const getJtmAssignmentById = async (id: number): Promise<JtmAssignment | null> => {
  try {
    const result = await db.select()
      .from(jtmAssignmentsTable)
      .where(eq(jtmAssignmentsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to get JTM assignment by ID:', error);
    throw error;
  }
};

/**
 * Update JTM assignment information
 * Updates existing JTM assignment record with new data
 */
export const updateJtmAssignment = async (input: { id: number } & Partial<CreateJtmAssignmentInput>): Promise<JtmAssignment> => {
  try {
    // Check if JTM assignment exists
    const existing = await getJtmAssignmentById(input.id);
    if (!existing) {
      throw new Error(`JTM assignment with id ${input.id} not found`);
    }

    // Verify referenced entities exist if they're being updated
    if (input.academic_year_id) {
      const academicYear = await db.select().from(academicYearsTable)
        .where(eq(academicYearsTable.id, input.academic_year_id)).execute();
      if (academicYear.length === 0) {
        throw new Error(`Academic year with id ${input.academic_year_id} not found`);
      }
    }

    if (input.teacher_id) {
      const teacher = await db.select().from(teachersTable)
        .where(eq(teachersTable.id, input.teacher_id)).execute();
      if (teacher.length === 0) {
        throw new Error(`Teacher with id ${input.teacher_id} not found`);
      }
    }

    if (input.subject_id) {
      const subject = await db.select().from(subjectsTable)
        .where(eq(subjectsTable.id, input.subject_id)).execute();
      if (subject.length === 0) {
        throw new Error(`Subject with id ${input.subject_id} not found`);
      }
    }

    if (input.class_id) {
      const classEntity = await db.select().from(classesTable)
        .where(eq(classesTable.id, input.class_id)).execute();
      if (classEntity.length === 0) {
        throw new Error(`Class with id ${input.class_id} not found`);
      }
    }

    // Build update object
    const updateData: any = { updated_at: new Date() };
    if (input.academic_year_id !== undefined) updateData.academic_year_id = input.academic_year_id;
    if (input.teacher_id !== undefined) updateData.teacher_id = input.teacher_id;
    if (input.subject_id !== undefined) updateData.subject_id = input.subject_id;
    if (input.class_id !== undefined) updateData.class_id = input.class_id;
    if (input.allocated_hours !== undefined) updateData.allocated_hours = input.allocated_hours;

    const result = await db.update(jtmAssignmentsTable)
      .set(updateData)
      .where(eq(jtmAssignmentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('JTM assignment update failed:', error);
    throw error;
  }
};

/**
 * Delete JTM assignment by ID
 * Removes JTM assignment record from database
 */
export const deleteJtmAssignment = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(jtmAssignmentsTable)
      .where(eq(jtmAssignmentsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('JTM assignment deletion failed:', error);
    throw error;
  }
};

/**
 * Get JTM allocation progress by class
 * Returns progress of JTM allocation compared to curriculum limits for each class
 */
export const getJtmAllocationProgress = async (academicYearId: number): Promise<Array<{
  class_id: number;
  class_name: string;
  total_allocated: number;
  curriculum_limit: number;
  progress_percentage: number;
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    allocated_hours: number;
    curriculum_hours: number;
  }>;
}>> => {
  try {
    // Get all classes for the academic year
    const classes = await db.select()
      .from(classesTable)
      .where(eq(classesTable.academic_year_id, academicYearId))
      .execute();

    // Get academic year info for curriculum limit
    const academicYear = await db.select()
      .from(academicYearsTable)
      .where(eq(academicYearsTable.id, academicYearId))
      .execute();

    if (academicYear.length === 0) {
      throw new Error(`Academic year with id ${academicYearId} not found`);
    }

    const curriculumLimit = academicYear[0].total_time_allocation;
    const progress: Array<{
      class_id: number;
      class_name: string;
      total_allocated: number;
      curriculum_limit: number;
      progress_percentage: number;
      subjects: Array<{
        subject_id: number;
        subject_name: string;
        allocated_hours: number;
        curriculum_hours: number;
      }>;
    }> = [];

    for (const classItem of classes) {
      // Get JTM assignments with subject details for this class
      const assignments = await db.select()
        .from(jtmAssignmentsTable)
        .innerJoin(subjectsTable, eq(jtmAssignmentsTable.subject_id, subjectsTable.id))
        .where(and(
          eq(jtmAssignmentsTable.class_id, classItem.id),
          eq(jtmAssignmentsTable.academic_year_id, academicYearId)
        ))
        .execute();

      const subjects = assignments.map(result => ({
        subject_id: result.subjects.id,
        subject_name: result.subjects.name,
        allocated_hours: result.jtm_assignments.allocated_hours,
        curriculum_hours: result.subjects.time_allocation
      }));

      const totalAllocated = subjects.reduce((sum, subject) => sum + subject.allocated_hours, 0);
      const progressPercentage = curriculumLimit > 0 ? (totalAllocated / curriculumLimit) * 100 : 0;

      progress.push({
        class_id: classItem.id,
        class_name: classItem.class_name,
        total_allocated: totalAllocated,
        curriculum_limit: curriculumLimit,
        progress_percentage: Math.round(progressPercentage * 100) / 100, // Round to 2 decimal places
        subjects: subjects
      });
    }

    return progress;
  } catch (error) {
    console.error('Failed to get JTM allocation progress:', error);
    throw error;
  }
};

/**
 * Validate JTM allocation
 * Validates if JTM allocation doesn't exceed curriculum limits
 */
export const validateJtmAllocation = async (input: CreateJtmAssignmentInput): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get academic year info
    const academicYear = await db.select()
      .from(academicYearsTable)
      .where(eq(academicYearsTable.id, input.academic_year_id))
      .execute();

    if (academicYear.length === 0) {
      errors.push(`Academic year with id ${input.academic_year_id} not found`);
      return { isValid: false, errors, warnings };
    }

    // Get current total allocated hours for this class
    const currentAssignments = await db.select()
      .from(jtmAssignmentsTable)
      .where(and(
        eq(jtmAssignmentsTable.class_id, input.class_id),
        eq(jtmAssignmentsTable.academic_year_id, input.academic_year_id)
      ))
      .execute();

    const currentTotal = currentAssignments.reduce((sum, assignment) => sum + assignment.allocated_hours, 0);
    const newTotal = currentTotal + input.allocated_hours;
    const curriculumLimit = academicYear[0].total_time_allocation;

    // Check if allocation exceeds curriculum limit
    if (newTotal > curriculumLimit) {
      errors.push(`Total allocation (${newTotal} hours) exceeds curriculum limit (${curriculumLimit} hours) for this class`);
    }

    // Check if allocation is getting close to limit (warning at 90%)
    if (newTotal > curriculumLimit * 0.9 && newTotal <= curriculumLimit) {
      warnings.push(`Total allocation (${newTotal} hours) is approaching curriculum limit (${curriculumLimit} hours)`);
    }

    // Check for duplicate assignment (same teacher, subject, class in same academic year)
    const duplicateCheck = await db.select()
      .from(jtmAssignmentsTable)
      .where(and(
        eq(jtmAssignmentsTable.academic_year_id, input.academic_year_id),
        eq(jtmAssignmentsTable.teacher_id, input.teacher_id),
        eq(jtmAssignmentsTable.subject_id, input.subject_id),
        eq(jtmAssignmentsTable.class_id, input.class_id)
      ))
      .execute();

    if (duplicateCheck.length > 0) {
      errors.push('This teacher is already assigned to teach this subject in this class');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    console.error('JTM allocation validation failed:', error);
    return {
      isValid: false,
      errors: ['Validation failed due to system error'],
      warnings: []
    };
  }
};