import { db } from '../db';
import { 
  teachersTable, 
  jtmAssignmentsTable, 
  taskAssignmentsTable, 
  subjectsTable, 
  classesTable, 
  additionalTasksTable 
} from '../db/schema';
import { type TeacherWorkload, type WorkloadStatus } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

// Constants for workload calculation
const MIN_WORKLOAD_HOURS = 24;
const MAX_WORKLOAD_HOURS = 40;

/**
 * Determine workload status based on total hours
 */
const getWorkloadStatus = (totalHours: number): WorkloadStatus => {
  if (totalHours < MIN_WORKLOAD_HOURS) return 'kurang';
  if (totalHours > MAX_WORKLOAD_HOURS) return 'lebih';
  return 'layak';
};

/**
 * Calculate teacher workload
 * Calculates total workload for specific teacher based on JTM and additional tasks
 */
export const calculateTeacherWorkload = async (teacherId: number, academicYearId: number): Promise<TeacherWorkload> => {
  try {
    // Get teacher info
    const teacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, teacherId))
      .execute();

    if (teacher.length === 0) {
      throw new Error(`Teacher with id ${teacherId} not found`);
    }

    // Get JTM assignments with subject and class info
    const jtmAssignments = await db.select({
      subject_name: subjectsTable.name,
      class_name: classesTable.class_name,
      allocated_hours: jtmAssignmentsTable.allocated_hours
    })
      .from(jtmAssignmentsTable)
      .innerJoin(subjectsTable, eq(jtmAssignmentsTable.subject_id, subjectsTable.id))
      .innerJoin(classesTable, eq(jtmAssignmentsTable.class_id, classesTable.id))
      .where(and(
        eq(jtmAssignmentsTable.teacher_id, teacherId),
        eq(jtmAssignmentsTable.academic_year_id, academicYearId)
      ))
      .execute();

    // Get task assignments with task info
    const taskAssignments = await db.select({
      task_name: additionalTasksTable.name,
      jp_equivalent: additionalTasksTable.jp_equivalent
    })
      .from(taskAssignmentsTable)
      .innerJoin(additionalTasksTable, eq(taskAssignmentsTable.task_id, additionalTasksTable.id))
      .where(and(
        eq(taskAssignmentsTable.teacher_id, teacherId),
        eq(taskAssignmentsTable.academic_year_id, academicYearId)
      ))
      .execute();

    // Calculate totals
    const totalJtmHours = jtmAssignments.reduce((sum, assignment) => sum + assignment.allocated_hours, 0);
    const totalTaskEquivalent = taskAssignments.reduce((sum, assignment) => sum + parseFloat(assignment.jp_equivalent), 0);
    const totalWorkload = totalJtmHours + totalTaskEquivalent;

    // Build details array
    const details = [
      ...jtmAssignments.map(assignment => ({
        type: 'jtm' as const,
        subject_name: assignment.subject_name,
        class_name: assignment.class_name,
        hours: assignment.allocated_hours
      })),
      ...taskAssignments.map(assignment => ({
        type: 'task' as const,
        task_name: assignment.task_name,
        hours: parseFloat(assignment.jp_equivalent)
      }))
    ];

    return {
      teacher_id: teacherId,
      teacher_name: teacher[0].name,
      total_jtm_hours: totalJtmHours,
      total_task_equivalent: totalTaskEquivalent,
      total_workload: totalWorkload,
      status: getWorkloadStatus(totalWorkload),
      details
    };
  } catch (error) {
    console.error('Calculate teacher workload failed:', error);
    throw error;
  }
};

/**
 * Get all teacher workloads for academic year
 * Returns workload summary for all teachers in specific academic year
 */
export const getAllTeacherWorkloads = async (academicYearId: number): Promise<TeacherWorkload[]> => {
  try {
    // Get all teachers who have assignments in this academic year
    const teacherIds = await db.select({
      teacher_id: jtmAssignmentsTable.teacher_id
    })
      .from(jtmAssignmentsTable)
      .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
      .execute();

    // Get unique teacher IDs (including those who might only have task assignments)
    const taskTeacherIds = await db.select({
      teacher_id: taskAssignmentsTable.teacher_id
    })
      .from(taskAssignmentsTable)
      .where(eq(taskAssignmentsTable.academic_year_id, academicYearId))
      .execute();

    const allTeacherIds = Array.from(new Set([
      ...teacherIds.map(t => t.teacher_id),
      ...taskTeacherIds.map(t => t.teacher_id)
    ]));

    // Calculate workload for each teacher
    const workloads = await Promise.all(
      allTeacherIds.map(teacherId => calculateTeacherWorkload(teacherId, academicYearId))
    );

    return workloads;
  } catch (error) {
    console.error('Get all teacher workloads failed:', error);
    throw error;
  }
};

/**
 * Get teachers by workload status
 * Returns teachers filtered by their workload status (layak/lebih/kurang)
 */
export const getTeachersByWorkloadStatus = async (academicYearId: number, status: WorkloadStatus): Promise<TeacherWorkload[]> => {
  try {
    const allWorkloads = await getAllTeacherWorkloads(academicYearId);
    return allWorkloads.filter(workload => workload.status === status);
  } catch (error) {
    console.error('Get teachers by workload status failed:', error);
    throw error;
  }
};

/**
 * Get workload validation summary
 * Returns summary of workload validation for academic year
 */
export const getWorkloadValidationSummary = async (academicYearId: number): Promise<{
  total_teachers: number;
  layak_count: number;
  lebih_count: number;
  kurang_count: number;
  average_workload: number;
}> => {
  try {
    const allWorkloads = await getAllTeacherWorkloads(academicYearId);
    
    const summary = {
      total_teachers: allWorkloads.length,
      layak_count: allWorkloads.filter(w => w.status === 'layak').length,
      lebih_count: allWorkloads.filter(w => w.status === 'lebih').length,
      kurang_count: allWorkloads.filter(w => w.status === 'kurang').length,
      average_workload: allWorkloads.length > 0 
        ? allWorkloads.reduce((sum, w) => sum + w.total_workload, 0) / allWorkloads.length 
        : 0
    };

    return summary;
  } catch (error) {
    console.error('Get workload validation summary failed:', error);
    throw error;
  }
};

/**
 * Get teacher workload details
 * Returns detailed breakdown of specific teacher's workload
 */
export const getTeacherWorkloadDetails = async (teacherId: number, academicYearId: number): Promise<{
  teacher: {
    id: number;
    name: string;
    nip_nuptk: string;
  };
  jtm_assignments: Array<{
    subject_name: string;
    class_name: string;
    allocated_hours: number;
  }>;
  task_assignments: Array<{
    task_name: string;
    jp_equivalent: number;
    description: string | null;
  }>;
  summary: {
    total_jtm: number;
    total_tasks: number;
    total_workload: number;
    status: WorkloadStatus;
    minimum_required: number;
    surplus_deficit: number;
  };
}> => {
  try {
    // Get teacher info
    const teacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, teacherId))
      .execute();

    if (teacher.length === 0) {
      throw new Error(`Teacher with id ${teacherId} not found`);
    }

    // Get detailed JTM assignments
    const jtmAssignments = await db.select({
      subject_name: subjectsTable.name,
      class_name: classesTable.class_name,
      allocated_hours: jtmAssignmentsTable.allocated_hours
    })
      .from(jtmAssignmentsTable)
      .innerJoin(subjectsTable, eq(jtmAssignmentsTable.subject_id, subjectsTable.id))
      .innerJoin(classesTable, eq(jtmAssignmentsTable.class_id, classesTable.id))
      .where(and(
        eq(jtmAssignmentsTable.teacher_id, teacherId),
        eq(jtmAssignmentsTable.academic_year_id, academicYearId)
      ))
      .execute();

    // Get detailed task assignments
    const taskAssignments = await db.select({
      task_name: additionalTasksTable.name,
      jp_equivalent: additionalTasksTable.jp_equivalent,
      description: taskAssignmentsTable.description
    })
      .from(taskAssignmentsTable)
      .innerJoin(additionalTasksTable, eq(taskAssignmentsTable.task_id, additionalTasksTable.id))
      .where(and(
        eq(taskAssignmentsTable.teacher_id, teacherId),
        eq(taskAssignmentsTable.academic_year_id, academicYearId)
      ))
      .execute();

    // Calculate totals
    const totalJtm = jtmAssignments.reduce((sum, assignment) => sum + assignment.allocated_hours, 0);
    const totalTasks = taskAssignments.reduce((sum, assignment) => sum + parseFloat(assignment.jp_equivalent), 0);
    const totalWorkload = totalJtm + totalTasks;
    const surplusDeficit = totalWorkload - MIN_WORKLOAD_HOURS;

    return {
      teacher: {
        id: teacher[0].id,
        name: teacher[0].name,
        nip_nuptk: teacher[0].nip_nuptk
      },
      jtm_assignments: jtmAssignments,
      task_assignments: taskAssignments.map(assignment => ({
        task_name: assignment.task_name,
        jp_equivalent: parseFloat(assignment.jp_equivalent),
        description: assignment.description
      })),
      summary: {
        total_jtm: totalJtm,
        total_tasks: totalTasks,
        total_workload: totalWorkload,
        status: getWorkloadStatus(totalWorkload),
        minimum_required: MIN_WORKLOAD_HOURS,
        surplus_deficit: surplusDeficit
      }
    };
  } catch (error) {
    console.error('Get teacher workload details failed:', error);
    throw error;
  }
};