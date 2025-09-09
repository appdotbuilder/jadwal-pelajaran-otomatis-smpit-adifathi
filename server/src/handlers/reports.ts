import { db } from '../db';
import { 
  schedulesTable, 
  classesTable, 
  teachersTable, 
  subjectsTable, 
  academicYearsTable,
  jtmAssignmentsTable,
  taskAssignmentsTable,
  additionalTasksTable,
  timeSlotsTable,
  scheduleTemplatesTable
} from '../db/schema';
import { eq, and, SQL } from 'drizzle-orm';

/**
 * Generate schedule report for class
 * Creates formatted schedule report for specific class that can be printed or exported
 */
export const generateScheduleReportByClass = async (
    classId: number, 
    academicYearId: number,
    format: 'pdf' | 'excel' = 'pdf'
): Promise<{
    success: boolean;
    report_url?: string;
    error?: string;
    data?: any;
}> => {
    try {
        // Verify class and academic year exist
        const classQuery = await db.select()
            .from(classesTable)
            .where(and(
                eq(classesTable.id, classId),
                eq(classesTable.academic_year_id, academicYearId)
            ))
            .execute();

        if (classQuery.length === 0) {
            return {
                success: false,
                error: 'Class not found or not associated with the academic year'
            };
        }

        // Get schedule data for the class
        const scheduleData = await db.select({
            schedule_id: schedulesTable.id,
            day_of_week: schedulesTable.day_of_week,
            jp_number: schedulesTable.jp_number,
            subject_name: subjectsTable.name,
            subject_code: subjectsTable.code,
            teacher_name: teachersTable.name,
            teacher_nip: teachersTable.nip_nuptk,
            class_name: classesTable.class_name,
            is_manual: schedulesTable.is_manual,
            start_time: timeSlotsTable.start_time,
            end_time: timeSlotsTable.end_time,
            slot_type: timeSlotsTable.slot_type
        })
        .from(schedulesTable)
        .innerJoin(classesTable, eq(schedulesTable.class_id, classesTable.id))
        .leftJoin(subjectsTable, eq(schedulesTable.subject_id, subjectsTable.id))
        .leftJoin(teachersTable, eq(schedulesTable.teacher_id, teachersTable.id))
        .leftJoin(timeSlotsTable, and(
            eq(timeSlotsTable.template_id, schedulesTable.template_id),
            eq(timeSlotsTable.day_of_week, schedulesTable.day_of_week),
            eq(timeSlotsTable.jp_number, schedulesTable.jp_number)
        ))
        .where(and(
            eq(schedulesTable.class_id, classId),
            eq(schedulesTable.academic_year_id, academicYearId)
        ))
        .execute();

        return {
            success: true,
            report_url: `/reports/schedule-class-${classId}.${format}`,
            data: {
                class_info: classQuery[0],
                schedule: scheduleData
            }
        };
    } catch (error) {
        console.error('Schedule report generation failed:', error);
        return {
            success: false,
            error: 'Failed to generate schedule report'
        };
    }
};

/**
 * Generate schedule report for teacher
 * Creates formatted schedule report for specific teacher
 */
export const generateScheduleReportByTeacher = async (
    teacherId: number, 
    academicYearId: number,
    format: 'pdf' | 'excel' = 'pdf'
): Promise<{
    success: boolean;
    report_url?: string;
    error?: string;
    data?: any;
}> => {
    try {
        // Verify teacher exists
        const teacherQuery = await db.select()
            .from(teachersTable)
            .where(eq(teachersTable.id, teacherId))
            .execute();

        if (teacherQuery.length === 0) {
            return {
                success: false,
                error: 'Teacher not found'
            };
        }

        // Get teacher's schedule
        const scheduleData = await db.select({
            schedule_id: schedulesTable.id,
            day_of_week: schedulesTable.day_of_week,
            jp_number: schedulesTable.jp_number,
            subject_name: subjectsTable.name,
            subject_code: subjectsTable.code,
            class_name: classesTable.class_name,
            grade_level: classesTable.grade_level,
            start_time: timeSlotsTable.start_time,
            end_time: timeSlotsTable.end_time,
            slot_type: timeSlotsTable.slot_type
        })
        .from(schedulesTable)
        .innerJoin(classesTable, eq(schedulesTable.class_id, classesTable.id))
        .leftJoin(subjectsTable, eq(schedulesTable.subject_id, subjectsTable.id))
        .leftJoin(timeSlotsTable, and(
            eq(timeSlotsTable.template_id, schedulesTable.template_id),
            eq(timeSlotsTable.day_of_week, schedulesTable.day_of_week),
            eq(timeSlotsTable.jp_number, schedulesTable.jp_number)
        ))
        .where(and(
            eq(schedulesTable.teacher_id, teacherId),
            eq(schedulesTable.academic_year_id, academicYearId)
        ))
        .execute();

        return {
            success: true,
            report_url: `/reports/schedule-teacher-${teacherId}.${format}`,
            data: {
                teacher_info: teacherQuery[0],
                schedule: scheduleData
            }
        };
    } catch (error) {
        console.error('Teacher schedule report generation failed:', error);
        return {
            success: false,
            error: 'Failed to generate teacher schedule report'
        };
    }
};

/**
 * Generate workload report
 * Creates comprehensive teacher workload report for academic year
 */
export const generateWorkloadReport = async (
    academicYearId: number,
    format: 'pdf' | 'excel' = 'pdf'
): Promise<{
    success: boolean;
    report_url?: string;
    error?: string;
    data?: any;
}> => {
    try {
        // Verify academic year exists
        const academicYearQuery = await db.select()
            .from(academicYearsTable)
            .where(eq(academicYearsTable.id, academicYearId))
            .execute();

        if (academicYearQuery.length === 0) {
            return {
                success: false,
                error: 'Academic year not found'
            };
        }

        // Get JTM assignments
        const jtmData = await db.select({
            teacher_id: jtmAssignmentsTable.teacher_id,
            teacher_name: teachersTable.name,
            teacher_nip: teachersTable.nip_nuptk,
            subject_name: subjectsTable.name,
            class_name: classesTable.class_name,
            allocated_hours: jtmAssignmentsTable.allocated_hours
        })
        .from(jtmAssignmentsTable)
        .innerJoin(teachersTable, eq(jtmAssignmentsTable.teacher_id, teachersTable.id))
        .innerJoin(subjectsTable, eq(jtmAssignmentsTable.subject_id, subjectsTable.id))
        .innerJoin(classesTable, eq(jtmAssignmentsTable.class_id, classesTable.id))
        .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
        .execute();

        // Get task assignments
        const taskData = await db.select({
            teacher_id: taskAssignmentsTable.teacher_id,
            teacher_name: teachersTable.name,
            teacher_nip: teachersTable.nip_nuptk,
            task_name: additionalTasksTable.name,
            jp_equivalent: additionalTasksTable.jp_equivalent,
            description: taskAssignmentsTable.description
        })
        .from(taskAssignmentsTable)
        .innerJoin(teachersTable, eq(taskAssignmentsTable.teacher_id, teachersTable.id))
        .innerJoin(additionalTasksTable, eq(taskAssignmentsTable.task_id, additionalTasksTable.id))
        .where(eq(taskAssignmentsTable.academic_year_id, academicYearId))
        .execute();

        // Process workload data
        const workloadSummary = new Map();

        // Process JTM data
        jtmData.forEach(item => {
            if (!workloadSummary.has(item.teacher_id)) {
                workloadSummary.set(item.teacher_id, {
                    teacher_id: item.teacher_id,
                    teacher_name: item.teacher_name,
                    teacher_nip: item.teacher_nip,
                    total_jtm_hours: 0,
                    total_task_equivalent: 0,
                    jtm_details: [],
                    task_details: []
                });
            }
            const summary = workloadSummary.get(item.teacher_id);
            summary.total_jtm_hours += item.allocated_hours;
            summary.jtm_details.push({
                subject_name: item.subject_name,
                class_name: item.class_name,
                hours: item.allocated_hours
            });
        });

        // Process task data
        taskData.forEach(item => {
            const jpEquivalent = parseFloat(item.jp_equivalent);
            if (!workloadSummary.has(item.teacher_id)) {
                workloadSummary.set(item.teacher_id, {
                    teacher_id: item.teacher_id,
                    teacher_name: item.teacher_name,
                    teacher_nip: item.teacher_nip,
                    total_jtm_hours: 0,
                    total_task_equivalent: 0,
                    jtm_details: [],
                    task_details: []
                });
            }
            const summary = workloadSummary.get(item.teacher_id);
            summary.total_task_equivalent += jpEquivalent;
            summary.task_details.push({
                task_name: item.task_name,
                jp_equivalent: jpEquivalent,
                description: item.description
            });
        });

        // Calculate total workload and status
        const workloadReport = Array.from(workloadSummary.values()).map(summary => {
            const totalWorkload = summary.total_jtm_hours + summary.total_task_equivalent;
            let status = 'layak';
            if (totalWorkload > 24) status = 'lebih';
            else if (totalWorkload < 24) status = 'kurang';

            return {
                ...summary,
                total_workload: totalWorkload,
                status
            };
        });

        return {
            success: true,
            report_url: `/reports/workload-${academicYearId}.${format}`,
            data: {
                academic_year: academicYearQuery[0],
                workload_summary: workloadReport
            }
        };
    } catch (error) {
        console.error('Workload report generation failed:', error);
        return {
            success: false,
            error: 'Failed to generate workload report'
        };
    }
};

/**
 * Generate JTM allocation report
 * Creates JTM allocation progress report by class
 */
export const generateJtmAllocationReport = async (
    academicYearId: number,
    format: 'pdf' | 'excel' = 'pdf'
): Promise<{
    success: boolean;
    report_url?: string;
    error?: string;
    data?: any;
}> => {
    try {
        // Get JTM allocation data
        const jtmData = await db.select({
            assignment_id: jtmAssignmentsTable.id,
            class_name: classesTable.class_name,
            grade_level: classesTable.grade_level,
            subject_name: subjectsTable.name,
            subject_code: subjectsTable.code,
            base_time_allocation: subjectsTable.time_allocation,
            teacher_name: teachersTable.name,
            teacher_nip: teachersTable.nip_nuptk,
            allocated_hours: jtmAssignmentsTable.allocated_hours
        })
        .from(jtmAssignmentsTable)
        .innerJoin(classesTable, eq(jtmAssignmentsTable.class_id, classesTable.id))
        .innerJoin(subjectsTable, eq(jtmAssignmentsTable.subject_id, subjectsTable.id))
        .innerJoin(teachersTable, eq(jtmAssignmentsTable.teacher_id, teachersTable.id))
        .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
        .execute();

        // Group by class and subject for analysis
        const allocationSummary = new Map();

        jtmData.forEach(item => {
            const key = `${item.class_name}-${item.subject_code}`;
            if (!allocationSummary.has(key)) {
                allocationSummary.set(key, {
                    class_name: item.class_name,
                    grade_level: item.grade_level,
                    subject_name: item.subject_name,
                    subject_code: item.subject_code,
                    base_time_allocation: item.base_time_allocation,
                    total_allocated: 0,
                    assignments: []
                });
            }
            const summary = allocationSummary.get(key);
            summary.total_allocated += item.allocated_hours;
            summary.assignments.push({
                teacher_name: item.teacher_name,
                teacher_nip: item.teacher_nip,
                allocated_hours: item.allocated_hours
            });
        });

        // Calculate allocation status
        const allocationReport = Array.from(allocationSummary.values()).map(summary => ({
            ...summary,
            allocation_status: summary.total_allocated === summary.base_time_allocation ? 'complete' : 
                             summary.total_allocated > summary.base_time_allocation ? 'over' : 'under',
            difference: summary.total_allocated - summary.base_time_allocation
        }));

        return {
            success: true,
            report_url: `/reports/jtm-allocation-${academicYearId}.${format}`,
            data: {
                allocation_summary: allocationReport,
                total_assignments: jtmData.length
            }
        };
    } catch (error) {
        console.error('JTM allocation report generation failed:', error);
        return {
            success: false,
            error: 'Failed to generate JTM allocation report'
        };
    }
};

/**
 * Generate task allocation report
 * Creates additional task allocation report
 */
export const generateTaskAllocationReport = async (
    academicYearId: number,
    format: 'pdf' | 'excel' = 'pdf'
): Promise<{
    success: boolean;
    report_url?: string;
    error?: string;
    data?: any;
}> => {
    try {
        // Get task allocation data
        const taskData = await db.select({
            assignment_id: taskAssignmentsTable.id,
            teacher_name: teachersTable.name,
            teacher_nip: teachersTable.nip_nuptk,
            task_name: additionalTasksTable.name,
            task_description: additionalTasksTable.description,
            jp_equivalent: additionalTasksTable.jp_equivalent,
            assignment_description: taskAssignmentsTable.description
        })
        .from(taskAssignmentsTable)
        .innerJoin(teachersTable, eq(taskAssignmentsTable.teacher_id, teachersTable.id))
        .innerJoin(additionalTasksTable, eq(taskAssignmentsTable.task_id, additionalTasksTable.id))
        .where(eq(taskAssignmentsTable.academic_year_id, academicYearId))
        .execute();

        // Process data with numeric conversion
        const processedTaskData = taskData.map(task => ({
            ...task,
            jp_equivalent: parseFloat(task.jp_equivalent)
        }));

        // Group by task type for summary
        const taskSummary = new Map();
        processedTaskData.forEach(item => {
            if (!taskSummary.has(item.task_name)) {
                taskSummary.set(item.task_name, {
                    task_name: item.task_name,
                    task_description: item.task_description,
                    jp_equivalent: item.jp_equivalent,
                    assigned_count: 0,
                    total_jp: 0,
                    assignments: []
                });
            }
            const summary = taskSummary.get(item.task_name);
            summary.assigned_count += 1;
            summary.total_jp += item.jp_equivalent;
            summary.assignments.push({
                teacher_name: item.teacher_name,
                teacher_nip: item.teacher_nip,
                assignment_description: item.assignment_description
            });
        });

        return {
            success: true,
            report_url: `/reports/task-allocation-${academicYearId}.${format}`,
            data: {
                task_assignments: processedTaskData,
                task_summary: Array.from(taskSummary.values()),
                total_assignments: processedTaskData.length
            }
        };
    } catch (error) {
        console.error('Task allocation report generation failed:', error);
        return {
            success: false,
            error: 'Failed to generate task allocation report'
        };
    }
};

/**
 * Get available report filters
 * Returns available filter options for reports
 */
export const getReportFilters = async (academicYearId: number): Promise<{
    classes: Array<{ id: number; name: string; grade_level: number }>;
    teachers: Array<{ id: number; name: string; nip_nuptk: string }>;
    subjects: Array<{ id: number; name: string; code: string }>;
}> => {
    try {
        // Get classes for the academic year
        const classes = await db.select({
            id: classesTable.id,
            name: classesTable.class_name,
            grade_level: classesTable.grade_level
        })
        .from(classesTable)
        .where(eq(classesTable.academic_year_id, academicYearId))
        .execute();

        // Get teachers who have assignments in this academic year
        const teachersWithAssignments = await db.select({
            id: teachersTable.id,
            name: teachersTable.name,
            nip_nuptk: teachersTable.nip_nuptk
        })
        .from(teachersTable)
        .innerJoin(jtmAssignmentsTable, eq(teachersTable.id, jtmAssignmentsTable.teacher_id))
        .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
        .execute();

        // Remove duplicates from teachers
        const uniqueTeachers = Array.from(
            new Map(teachersWithAssignments.map(t => [t.id, t])).values()
        );

        // Get subjects that are assigned in this academic year
        const subjectsWithAssignments = await db.select({
            id: subjectsTable.id,
            name: subjectsTable.name,
            code: subjectsTable.code
        })
        .from(subjectsTable)
        .innerJoin(jtmAssignmentsTable, eq(subjectsTable.id, jtmAssignmentsTable.subject_id))
        .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
        .execute();

        // Remove duplicates from subjects
        const uniqueSubjects = Array.from(
            new Map(subjectsWithAssignments.map(s => [s.id, s])).values()
        );

        return {
            classes,
            teachers: uniqueTeachers,
            subjects: uniqueSubjects
        };
    } catch (error) {
        console.error('Failed to get report filters:', error);
        return {
            classes: [],
            teachers: [],
            subjects: []
        };
    }
};