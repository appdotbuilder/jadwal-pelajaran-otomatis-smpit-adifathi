import { db } from '../db';
import { 
  taskAssignmentsTable, 
  teachersTable, 
  additionalTasksTable,
  academicYearsTable 
} from '../db/schema';
import { type CreateTaskAssignmentInput, type TaskAssignment } from '../schema';
import { eq, and, sum, count } from 'drizzle-orm';

/**
 * Create a new task assignment
 * Handles task assignment creation linking teacher and additional task for specific academic year
 */
export const createTaskAssignment = async (input: CreateTaskAssignmentInput): Promise<TaskAssignment> => {
  try {
    // Verify foreign key references exist
    const [academicYear, teacher, task] = await Promise.all([
      db.select().from(academicYearsTable).where(eq(academicYearsTable.id, input.academic_year_id)).execute(),
      db.select().from(teachersTable).where(eq(teachersTable.id, input.teacher_id)).execute(),
      db.select().from(additionalTasksTable).where(eq(additionalTasksTable.id, input.task_id)).execute()
    ]);

    if (academicYear.length === 0) {
      throw new Error(`Academic year with id ${input.academic_year_id} not found`);
    }
    if (teacher.length === 0) {
      throw new Error(`Teacher with id ${input.teacher_id} not found`);
    }
    if (task.length === 0) {
      throw new Error(`Additional task with id ${input.task_id} not found`);
    }

    const result = await db.insert(taskAssignmentsTable)
      .values({
        academic_year_id: input.academic_year_id,
        teacher_id: input.teacher_id,
        task_id: input.task_id,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task assignment creation failed:', error);
    throw error;
  }
};

/**
 * Get task assignments by academic year
 * Returns task assignments for specific academic year
 */
export const getTaskAssignmentsByAcademicYear = async (academicYearId: number): Promise<TaskAssignment[]> => {
  try {
    const results = await db.select()
      .from(taskAssignmentsTable)
      .where(eq(taskAssignmentsTable.academic_year_id, academicYearId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch task assignments by academic year:', error);
    throw error;
  }
};

/**
 * Get task assignments by teacher
 * Returns task assignments for specific teacher in academic year
 */
export const getTaskAssignmentsByTeacher = async (teacherId: number, academicYearId: number): Promise<TaskAssignment[]> => {
  try {
    const results = await db.select()
      .from(taskAssignmentsTable)
      .where(
        and(
          eq(taskAssignmentsTable.teacher_id, teacherId),
          eq(taskAssignmentsTable.academic_year_id, academicYearId)
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch task assignments by teacher:', error);
    throw error;
  }
};

/**
 * Get task assignment by ID
 * Returns specific task assignment details by ID
 */
export const getTaskAssignmentById = async (id: number): Promise<TaskAssignment | null> => {
  try {
    const results = await db.select()
      .from(taskAssignmentsTable)
      .where(eq(taskAssignmentsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch task assignment by ID:', error);
    throw error;
  }
};

/**
 * Update task assignment information
 * Updates existing task assignment record with new data
 */
export const updateTaskAssignment = async (input: { id: number } & Partial<CreateTaskAssignmentInput>): Promise<TaskAssignment> => {
  try {
    // Verify the task assignment exists
    const existing = await getTaskAssignmentById(input.id);
    if (!existing) {
      throw new Error(`Task assignment with id ${input.id} not found`);
    }

    // Verify foreign key references exist if they are being updated
    if (input.academic_year_id && input.academic_year_id !== existing.academic_year_id) {
      const academicYear = await db.select().from(academicYearsTable)
        .where(eq(academicYearsTable.id, input.academic_year_id)).execute();
      if (academicYear.length === 0) {
        throw new Error(`Academic year with id ${input.academic_year_id} not found`);
      }
    }

    if (input.teacher_id && input.teacher_id !== existing.teacher_id) {
      const teacher = await db.select().from(teachersTable)
        .where(eq(teachersTable.id, input.teacher_id)).execute();
      if (teacher.length === 0) {
        throw new Error(`Teacher with id ${input.teacher_id} not found`);
      }
    }

    if (input.task_id && input.task_id !== existing.task_id) {
      const task = await db.select().from(additionalTasksTable)
        .where(eq(additionalTasksTable.id, input.task_id)).execute();
      if (task.length === 0) {
        throw new Error(`Additional task with id ${input.task_id} not found`);
      }
    }

    // Build update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.academic_year_id !== undefined) updateValues.academic_year_id = input.academic_year_id;
    if (input.teacher_id !== undefined) updateValues.teacher_id = input.teacher_id;
    if (input.task_id !== undefined) updateValues.task_id = input.task_id;
    if (input.description !== undefined) updateValues.description = input.description;

    const result = await db.update(taskAssignmentsTable)
      .set(updateValues)
      .where(eq(taskAssignmentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task assignment update failed:', error);
    throw error;
  }
};

/**
 * Delete task assignment by ID
 * Removes task assignment record from database
 */
export const deleteTaskAssignment = async (id: number): Promise<boolean> => {
  try {
    // Verify the task assignment exists
    const existing = await getTaskAssignmentById(id);
    if (!existing) {
      throw new Error(`Task assignment with id ${id} not found`);
    }

    await db.delete(taskAssignmentsTable)
      .where(eq(taskAssignmentsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Task assignment deletion failed:', error);
    throw error;
  }
};

/**
 * Get task assignment allocation chart data
 * Returns visualization data for allocated additional tasks
 */
export const getTaskAllocationChartData = async (academicYearId: number): Promise<Array<{
  task_name: string;
  task_equivalent: number;
  assigned_count: number;
  total_equivalent: number;
  teachers: Array<{
    teacher_id: number;
    teacher_name: string;
    description: string | null;
  }>;
}>> => {
  try {
    // Get all tasks with their assignments and teacher details for the academic year
    const results = await db.select({
      task_id: additionalTasksTable.id,
      task_name: additionalTasksTable.name,
      task_equivalent: additionalTasksTable.jp_equivalent,
      teacher_id: teachersTable.id,
      teacher_name: teachersTable.name,
      assignment_description: taskAssignmentsTable.description
    })
      .from(additionalTasksTable)
      .leftJoin(taskAssignmentsTable, eq(additionalTasksTable.id, taskAssignmentsTable.task_id))
      .leftJoin(teachersTable, eq(taskAssignmentsTable.teacher_id, teachersTable.id))
      .where(
        taskAssignmentsTable.academic_year_id 
          ? eq(taskAssignmentsTable.academic_year_id, academicYearId)
          : undefined
      )
      .execute();

    // Group results by task
    const taskMap = new Map<number, {
      task_name: string;
      task_equivalent: number;
      assigned_count: number;
      total_equivalent: number;
      teachers: Array<{
        teacher_id: number;
        teacher_name: string;
        description: string | null;
      }>;
    }>();

    results.forEach(result => {
      if (!taskMap.has(result.task_id)) {
        taskMap.set(result.task_id, {
          task_name: result.task_name,
          task_equivalent: parseFloat(result.task_equivalent),
          assigned_count: 0,
          total_equivalent: 0,
          teachers: []
        });
      }

      const task = taskMap.get(result.task_id)!;

      // If there's a teacher assignment, add it
      if (result.teacher_id && result.teacher_name) {
        task.teachers.push({
          teacher_id: result.teacher_id,
          teacher_name: result.teacher_name,
          description: result.assignment_description
        });
        task.assigned_count++;
        task.total_equivalent += parseFloat(result.task_equivalent);
      }
    });

    // Include tasks with no assignments
    const allTasks = await db.select()
      .from(additionalTasksTable)
      .execute();

    allTasks.forEach(task => {
      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, {
          task_name: task.name,
          task_equivalent: parseFloat(task.jp_equivalent),
          assigned_count: 0,
          total_equivalent: 0,
          teachers: []
        });
      }
    });

    return Array.from(taskMap.values());
  } catch (error) {
    console.error('Failed to fetch task allocation chart data:', error);
    throw error;
  }
};