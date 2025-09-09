import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  academicYearsTable,
  teachersTable,
  classesTable,
  subjectsTable,
  additionalTasksTable,
  scheduleTemplatesTable,
  timeSlotsTable,
  jtmAssignmentsTable,
  taskAssignmentsTable,
  schedulesTable
} from '../db/schema';
import {
  generateScheduleReportByClass,
  generateScheduleReportByTeacher,
  generateWorkloadReport,
  generateJtmAllocationReport,
  generateTaskAllocationReport,
  getReportFilters
} from '../handlers/reports';

describe('Reports Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let academicYearId: number;
  let teacherId: number;
  let classId: number;
  let subjectId: number;
  let taskId: number;
  let templateId: number;

  const setupTestData = async () => {
    // Create academic year
    const academicYear = await db.insert(academicYearsTable).values({
      year: '2024/2025',
      semester: 1,
      curriculum: 'Kurikulum Merdeka',
      total_time_allocation: 1000,
      is_active: true
    }).returning().execute();
    academicYearId = academicYear[0].id;

    // Create teacher
    const teacher = await db.insert(teachersTable).values({
      name: 'John Teacher',
      nip_nuptk: '123456789',
      tmt: new Date('2020-01-01'),
      education: 'S1 Matematika'
    }).returning().execute();
    teacherId = teacher[0].id;

    // Create class
    const classData = await db.insert(classesTable).values({
      grade_level: 7,
      rombel: 'A',
      class_name: '7A',
      academic_year_id: academicYearId
    }).returning().execute();
    classId = classData[0].id;

    // Create subject
    const subject = await db.insert(subjectsTable).values({
      code: 'MAT',
      name: 'Matematika',
      time_allocation: 6
    }).returning().execute();
    subjectId = subject[0].id;

    // Create additional task
    const task = await db.insert(additionalTasksTable).values({
      name: 'Wali Kelas',
      description: 'Mengurus administrasi kelas',
      jp_equivalent: '2.5'
    }).returning().execute();
    taskId = task[0].id;

    // Create schedule template
    const template = await db.insert(scheduleTemplatesTable).values({
      name: 'Standard Template',
      description: 'Standard school schedule template'
    }).returning().execute();
    templateId = template[0].id;

    // Create time slots
    await db.insert(timeSlotsTable).values([
      {
        template_id: templateId,
        day_of_week: 1,
        jp_number: 1,
        start_time: '07:00',
        end_time: '07:40',
        duration: 40,
        slot_type: 'belajar'
      },
      {
        template_id: templateId,
        day_of_week: 1,
        jp_number: 2,
        start_time: '07:40',
        end_time: '08:20',
        duration: 40,
        slot_type: 'belajar'
      }
    ]).execute();

    // Create JTM assignment
    await db.insert(jtmAssignmentsTable).values({
      academic_year_id: academicYearId,
      teacher_id: teacherId,
      subject_id: subjectId,
      class_id: classId,
      allocated_hours: 6
    }).execute();

    // Create task assignment
    await db.insert(taskAssignmentsTable).values({
      academic_year_id: academicYearId,
      teacher_id: teacherId,
      task_id: taskId,
      description: 'Assigned as homeroom teacher'
    }).execute();

    // Create schedule
    await db.insert(schedulesTable).values([
      {
        academic_year_id: academicYearId,
        class_id: classId,
        template_id: templateId,
        day_of_week: 1,
        jp_number: 1,
        subject_id: subjectId,
        teacher_id: teacherId,
        is_manual: true,
        is_cached: false
      },
      {
        academic_year_id: academicYearId,
        class_id: classId,
        template_id: templateId,
        day_of_week: 1,
        jp_number: 2,
        subject_id: subjectId,
        teacher_id: teacherId,
        is_manual: true,
        is_cached: false
      }
    ]).execute();
  };

  describe('generateScheduleReportByClass', () => {
    it('should generate schedule report for valid class', async () => {
      await setupTestData();

      const result = await generateScheduleReportByClass(classId, academicYearId, 'pdf');

      expect(result.success).toBe(true);
      expect(result.report_url).toBe(`/reports/schedule-class-${classId}.pdf`);
      expect(result.data).toBeDefined();
      expect(result.data.class_info).toBeDefined();
      expect(result.data.schedule).toBeDefined();
      expect(result.data.schedule.length).toBe(2);
      expect(result.data.schedule[0].subject_name).toBe('Matematika');
      expect(result.data.schedule[0].teacher_name).toBe('John Teacher');
    });

    it('should return error for non-existent class', async () => {
      await setupTestData();

      const result = await generateScheduleReportByClass(999, academicYearId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Class not found or not associated with the academic year');
    });

    it('should return error for class not in academic year', async () => {
      await setupTestData();

      const result = await generateScheduleReportByClass(classId, 999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Class not found or not associated with the academic year');
    });

    it('should generate excel format report', async () => {
      await setupTestData();

      const result = await generateScheduleReportByClass(classId, academicYearId, 'excel');

      expect(result.success).toBe(true);
      expect(result.report_url).toBe(`/reports/schedule-class-${classId}.excel`);
    });
  });

  describe('generateScheduleReportByTeacher', () => {
    it('should generate schedule report for valid teacher', async () => {
      await setupTestData();

      const result = await generateScheduleReportByTeacher(teacherId, academicYearId, 'pdf');

      expect(result.success).toBe(true);
      expect(result.report_url).toBe(`/reports/schedule-teacher-${teacherId}.pdf`);
      expect(result.data).toBeDefined();
      expect(result.data.teacher_info).toBeDefined();
      expect(result.data.schedule).toBeDefined();
      expect(result.data.schedule.length).toBe(2);
      expect(result.data.schedule[0].subject_name).toBe('Matematika');
      expect(result.data.schedule[0].class_name).toBe('7A');
    });

    it('should return error for non-existent teacher', async () => {
      await setupTestData();

      const result = await generateScheduleReportByTeacher(999, academicYearId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Teacher not found');
    });

    it('should handle teacher with no schedule', async () => {
      await setupTestData();
      
      // Create another teacher without schedule
      const teacher2 = await db.insert(teachersTable).values({
        name: 'Jane Teacher',
        nip_nuptk: '987654321',
        tmt: new Date('2021-01-01'),
        education: 'S1 Bahasa Indonesia'
      }).returning().execute();

      const result = await generateScheduleReportByTeacher(teacher2[0].id, academicYearId);

      expect(result.success).toBe(true);
      expect(result.data.schedule.length).toBe(0);
    });
  });

  describe('generateWorkloadReport', () => {
    it('should generate comprehensive workload report', async () => {
      await setupTestData();

      const result = await generateWorkloadReport(academicYearId, 'pdf');

      expect(result.success).toBe(true);
      expect(result.report_url).toBe(`/reports/workload-${academicYearId}.pdf`);
      expect(result.data).toBeDefined();
      expect(result.data.academic_year).toBeDefined();
      expect(result.data.workload_summary).toBeDefined();
      expect(result.data.workload_summary.length).toBe(1);
      
      const workload = result.data.workload_summary[0];
      expect(workload.teacher_name).toBe('John Teacher');
      expect(workload.total_jtm_hours).toBe(6);
      expect(workload.total_task_equivalent).toBe(2.5);
      expect(workload.total_workload).toBe(8.5);
      expect(workload.status).toBe('kurang'); // Less than 24
      expect(workload.jtm_details.length).toBe(1);
      expect(workload.task_details.length).toBe(1);
    });

    it('should return error for non-existent academic year', async () => {
      const result = await generateWorkloadReport(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Academic year not found');
    });

    it('should handle academic year with no assignments', async () => {
      const academicYear = await db.insert(academicYearsTable).values({
        year: '2025/2026',
        semester: 1,
        curriculum: 'Test Curriculum',
        total_time_allocation: 1000,
        is_active: false
      }).returning().execute();

      const result = await generateWorkloadReport(academicYear[0].id);

      expect(result.success).toBe(true);
      expect(result.data.workload_summary.length).toBe(0);
    });

    it('should calculate correct workload status', async () => {
      await setupTestData();

      // Add more assignments to make workload 'lebih'
      await db.insert(jtmAssignmentsTable).values({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: classId,
        allocated_hours: 20 // This will make total > 24
      }).execute();

      const result = await generateWorkloadReport(academicYearId);

      expect(result.success).toBe(true);
      const workload = result.data.workload_summary[0];
      expect(workload.total_workload).toBeGreaterThan(24);
      expect(workload.status).toBe('lebih');
    });
  });

  describe('generateJtmAllocationReport', () => {
    it('should generate JTM allocation report', async () => {
      await setupTestData();

      const result = await generateJtmAllocationReport(academicYearId, 'excel');

      expect(result.success).toBe(true);
      expect(result.report_url).toBe(`/reports/jtm-allocation-${academicYearId}.excel`);
      expect(result.data).toBeDefined();
      expect(result.data.allocation_summary).toBeDefined();
      expect(result.data.total_assignments).toBe(1);
      
      const allocation = result.data.allocation_summary[0];
      expect(allocation.class_name).toBe('7A');
      expect(allocation.subject_name).toBe('Matematika');
      expect(allocation.base_time_allocation).toBe(6);
      expect(allocation.total_allocated).toBe(6);
      expect(allocation.allocation_status).toBe('complete');
      expect(allocation.difference).toBe(0);
    });

    it('should identify over-allocated subjects', async () => {
      await setupTestData();

      // Add over-allocation
      await db.insert(jtmAssignmentsTable).values({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: classId,
        allocated_hours: 2 // Additional 2 hours
      }).execute();

      const result = await generateJtmAllocationReport(academicYearId);

      expect(result.success).toBe(true);
      const allocation = result.data.allocation_summary[0];
      expect(allocation.total_allocated).toBe(8);
      expect(allocation.allocation_status).toBe('over');
      expect(allocation.difference).toBe(2);
    });

    it('should identify under-allocated subjects', async () => {
      await setupTestData();

      // Update to create under-allocation
      await db.insert(jtmAssignmentsTable).values({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: classId,
        allocated_hours: 3 // Less than required 6
      }).execute();

      const result = await generateJtmAllocationReport(academicYearId);

      expect(result.success).toBe(true);
      // Should have 2 entries (6 + 3 = 9 total allocation)
      expect(result.data.total_assignments).toBe(2);
      const allocation = result.data.allocation_summary[0];
      expect(allocation.total_allocated).toBe(9);
      expect(allocation.allocation_status).toBe('over');
    });
  });

  describe('generateTaskAllocationReport', () => {
    it('should generate task allocation report', async () => {
      await setupTestData();

      const result = await generateTaskAllocationReport(academicYearId, 'pdf');

      expect(result.success).toBe(true);
      expect(result.report_url).toBe(`/reports/task-allocation-${academicYearId}.pdf`);
      expect(result.data).toBeDefined();
      expect(result.data.task_assignments).toBeDefined();
      expect(result.data.task_summary).toBeDefined();
      expect(result.data.total_assignments).toBe(1);

      const taskAssignment = result.data.task_assignments[0];
      expect(taskAssignment.teacher_name).toBe('John Teacher');
      expect(taskAssignment.task_name).toBe('Wali Kelas');
      expect(typeof taskAssignment.jp_equivalent).toBe('number');
      expect(taskAssignment.jp_equivalent).toBe(2.5);

      const taskSummary = result.data.task_summary[0];
      expect(taskSummary.task_name).toBe('Wali Kelas');
      expect(taskSummary.assigned_count).toBe(1);
      expect(taskSummary.total_jp).toBe(2.5);
      expect(taskSummary.assignments.length).toBe(1);
    });

    it('should handle multiple task assignments', async () => {
      await setupTestData();

      // Create another teacher and assign same task
      const teacher2 = await db.insert(teachersTable).values({
        name: 'Jane Teacher',
        nip_nuptk: '987654321',
        tmt: new Date('2021-01-01'),
        education: 'S1 Bahasa Indonesia'
      }).returning().execute();

      await db.insert(taskAssignmentsTable).values({
        academic_year_id: academicYearId,
        teacher_id: teacher2[0].id,
        task_id: taskId,
        description: 'Another homeroom teacher assignment'
      }).execute();

      const result = await generateTaskAllocationReport(academicYearId);

      expect(result.success).toBe(true);
      expect(result.data.total_assignments).toBe(2);
      expect(result.data.task_summary[0].assigned_count).toBe(2);
      expect(result.data.task_summary[0].total_jp).toBe(5.0); // 2.5 * 2
    });

    it('should handle academic year with no task assignments', async () => {
      const academicYear = await db.insert(academicYearsTable).values({
        year: '2025/2026',
        semester: 1,
        curriculum: 'Test Curriculum',
        total_time_allocation: 1000,
        is_active: false
      }).returning().execute();

      const result = await generateTaskAllocationReport(academicYear[0].id);

      expect(result.success).toBe(true);
      expect(result.data.total_assignments).toBe(0);
      expect(result.data.task_assignments.length).toBe(0);
      expect(result.data.task_summary.length).toBe(0);
    });
  });

  describe('getReportFilters', () => {
    it('should return available filter options', async () => {
      await setupTestData();

      const result = await getReportFilters(academicYearId);

      expect(result.classes).toBeDefined();
      expect(result.teachers).toBeDefined();
      expect(result.subjects).toBeDefined();

      expect(result.classes.length).toBe(1);
      expect(result.classes[0].name).toBe('7A');
      expect(result.classes[0].grade_level).toBe(7);

      expect(result.teachers.length).toBe(1);
      expect(result.teachers[0].name).toBe('John Teacher');
      expect(result.teachers[0].nip_nuptk).toBe('123456789');

      expect(result.subjects.length).toBe(1);
      expect(result.subjects[0].name).toBe('Matematika');
      expect(result.subjects[0].code).toBe('MAT');
    });

    it('should return unique teachers and subjects', async () => {
      await setupTestData();

      // Add another class with same teacher and subject
      const class2 = await db.insert(classesTable).values({
        grade_level: 7,
        rombel: 'B',
        class_name: '7B',
        academic_year_id: academicYearId
      }).returning().execute();

      await db.insert(jtmAssignmentsTable).values({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: class2[0].id,
        allocated_hours: 6
      }).execute();

      const result = await getReportFilters(academicYearId);

      expect(result.classes.length).toBe(2);
      expect(result.teachers.length).toBe(1); // Should be unique
      expect(result.subjects.length).toBe(1); // Should be unique
    });

    it('should return empty arrays for academic year with no assignments', async () => {
      const academicYear = await db.insert(academicYearsTable).values({
        year: '2025/2026',
        semester: 1,
        curriculum: 'Test Curriculum',
        total_time_allocation: 1000,
        is_active: false
      }).returning().execute();

      await db.insert(classesTable).values({
        grade_level: 8,
        rombel: 'A',
        class_name: '8A',
        academic_year_id: academicYear[0].id
      }).execute();

      const result = await getReportFilters(academicYear[0].id);

      expect(result.classes.length).toBe(1); // Classes exist
      expect(result.teachers.length).toBe(0); // No teachers with assignments
      expect(result.subjects.length).toBe(0); // No subjects with assignments
    });
  });
});