import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  teachersTable, 
  academicYearsTable, 
  classesTable, 
  subjectsTable, 
  additionalTasksTable,
  jtmAssignmentsTable,
  taskAssignmentsTable
} from '../db/schema';
import {
  calculateTeacherWorkload,
  getAllTeacherWorkloads,
  getTeachersByWorkloadStatus,
  getWorkloadValidationSummary,
  getTeacherWorkloadDetails
} from '../handlers/teacher_workload';

describe('Teacher Workload Handlers', () => {
  let teacherId: number;
  let academicYearId: number;
  let classId: number;
  let subjectId: number;
  let taskId: number;

  beforeEach(async () => {
    await createDB();

    // Create test teacher
    const teacher = await db.insert(teachersTable)
      .values({
        name: 'John Doe',
        nip_nuptk: '123456789',
        tmt: new Date('2020-01-01'),
        education: 'S1'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    // Create test academic year
    const academicYear = await db.insert(academicYearsTable)
      .values({
        year: '2024/2025',
        semester: 1,
        curriculum: 'Kurikulum Merdeka',
        total_time_allocation: 1000,
        is_active: true
      })
      .returning()
      .execute();
    academicYearId = academicYear[0].id;

    // Create test class
    const testClass = await db.insert(classesTable)
      .values({
        grade_level: 7,
        rombel: 'A',
        class_name: '7A',
        academic_year_id: academicYearId
      })
      .returning()
      .execute();
    classId = testClass[0].id;

    // Create test subject
    const subject = await db.insert(subjectsTable)
      .values({
        code: 'MTK',
        name: 'Matematika',
        time_allocation: 4
      })
      .returning()
      .execute();
    subjectId = subject[0].id;

    // Create test additional task
    const task = await db.insert(additionalTasksTable)
      .values({
        name: 'Wali Kelas',
        description: 'Pembinaan kelas',
        jp_equivalent: '4.00'
      })
      .returning()
      .execute();
    taskId = task[0].id;
  });

  afterEach(resetDB);

  describe('calculateTeacherWorkload', () => {
    it('should calculate workload for teacher with JTM assignments only', async () => {
      // Create JTM assignment
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 20
        })
        .execute();

      const result = await calculateTeacherWorkload(teacherId, academicYearId);

      expect(result.teacher_id).toEqual(teacherId);
      expect(result.teacher_name).toEqual('John Doe');
      expect(result.total_jtm_hours).toEqual(20);
      expect(result.total_task_equivalent).toEqual(0);
      expect(result.total_workload).toEqual(20);
      expect(result.status).toEqual('kurang'); // Less than 24
      expect(result.details).toHaveLength(1);
      expect(result.details[0].type).toEqual('jtm');
      expect(result.details[0].subject_name).toEqual('Matematika');
      expect(result.details[0].class_name).toEqual('7A');
      expect(result.details[0].hours).toEqual(20);
    });

    it('should calculate workload for teacher with task assignments only', async () => {
      // Create task assignment
      await db.insert(taskAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          task_id: taskId,
          description: 'Additional responsibility'
        })
        .execute();

      const result = await calculateTeacherWorkload(teacherId, academicYearId);

      expect(result.total_jtm_hours).toEqual(0);
      expect(result.total_task_equivalent).toEqual(4);
      expect(result.total_workload).toEqual(4);
      expect(result.status).toEqual('kurang');
      expect(result.details).toHaveLength(1);
      expect(result.details[0].type).toEqual('task');
      expect(result.details[0].task_name).toEqual('Wali Kelas');
      expect(result.details[0].hours).toEqual(4);
    });

    it('should calculate workload for teacher with both JTM and task assignments', async () => {
      // Create JTM assignment
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 20
        })
        .execute();

      // Create task assignment
      await db.insert(taskAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          task_id: taskId,
          description: null
        })
        .execute();

      const result = await calculateTeacherWorkload(teacherId, academicYearId);

      expect(result.total_jtm_hours).toEqual(20);
      expect(result.total_task_equivalent).toEqual(4);
      expect(result.total_workload).toEqual(24);
      expect(result.status).toEqual('layak'); // Exactly 24
      expect(result.details).toHaveLength(2);
    });

    it('should return "lebih" status for excessive workload', async () => {
      // Create excessive JTM assignment
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 45
        })
        .execute();

      const result = await calculateTeacherWorkload(teacherId, academicYearId);

      expect(result.total_workload).toEqual(45);
      expect(result.status).toEqual('lebih'); // More than 40
    });

    it('should throw error for non-existent teacher', async () => {
      await expect(calculateTeacherWorkload(999, academicYearId))
        .rejects.toThrow(/Teacher with id 999 not found/);
    });

    it('should handle teacher with no assignments', async () => {
      const result = await calculateTeacherWorkload(teacherId, academicYearId);

      expect(result.total_jtm_hours).toEqual(0);
      expect(result.total_task_equivalent).toEqual(0);
      expect(result.total_workload).toEqual(0);
      expect(result.status).toEqual('kurang');
      expect(result.details).toHaveLength(0);
    });
  });

  describe('getAllTeacherWorkloads', () => {
    it('should return workloads for all teachers with assignments', async () => {
      // Create second teacher
      const teacher2 = await db.insert(teachersTable)
        .values({
          name: 'Jane Smith',
          nip_nuptk: '987654321',
          tmt: new Date('2021-01-01'),
          education: 'S2'
        })
        .returning()
        .execute();

      // Create assignments for both teachers
      await db.insert(jtmAssignmentsTable)
        .values([
          {
            academic_year_id: academicYearId,
            teacher_id: teacherId,
            subject_id: subjectId,
            class_id: classId,
            allocated_hours: 18
          },
          {
            academic_year_id: academicYearId,
            teacher_id: teacher2[0].id,
            subject_id: subjectId,
            class_id: classId,
            allocated_hours: 22
          }
        ])
        .execute();

      const result = await getAllTeacherWorkloads(academicYearId);

      expect(result).toHaveLength(2);
      expect(result.map(w => w.teacher_name)).toContain('John Doe');
      expect(result.map(w => w.teacher_name)).toContain('Jane Smith');
    });

    it('should return empty array for academic year with no assignments', async () => {
      const result = await getAllTeacherWorkloads(999);
      expect(result).toHaveLength(0);
    });

    it('should include teachers with only task assignments', async () => {
      await db.insert(taskAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          task_id: taskId
        })
        .execute();

      const result = await getAllTeacherWorkloads(academicYearId);

      expect(result).toHaveLength(1);
      expect(result[0].total_task_equivalent).toEqual(4);
      expect(result[0].total_jtm_hours).toEqual(0);
    });
  });

  describe('getTeachersByWorkloadStatus', () => {
    beforeEach(async () => {
      // Create three teachers with different workload statuses
      const teacher2 = await db.insert(teachersTable)
        .values({
          name: 'Teacher Layak',
          nip_nuptk: '111111111',
          tmt: new Date('2020-01-01'),
          education: 'S1'
        })
        .returning()
        .execute();

      const teacher3 = await db.insert(teachersTable)
        .values({
          name: 'Teacher Lebih',
          nip_nuptk: '222222222',
          tmt: new Date('2020-01-01'),
          education: 'S1'
        })
        .returning()
        .execute();

      // Teacher 1: kurang (10 hours)
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 10
        })
        .execute();

      // Teacher 2: layak (30 hours)
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacher2[0].id,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 30
        })
        .execute();

      // Teacher 3: lebih (45 hours)
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacher3[0].id,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 45
        })
        .execute();
    });

    it('should return teachers with "kurang" status', async () => {
      const result = await getTeachersByWorkloadStatus(academicYearId, 'kurang');

      expect(result).toHaveLength(1);
      expect(result[0].teacher_name).toEqual('John Doe');
      expect(result[0].status).toEqual('kurang');
    });

    it('should return teachers with "layak" status', async () => {
      const result = await getTeachersByWorkloadStatus(academicYearId, 'layak');

      expect(result).toHaveLength(1);
      expect(result[0].teacher_name).toEqual('Teacher Layak');
      expect(result[0].status).toEqual('layak');
    });

    it('should return teachers with "lebih" status', async () => {
      const result = await getTeachersByWorkloadStatus(academicYearId, 'lebih');

      expect(result).toHaveLength(1);
      expect(result[0].teacher_name).toEqual('Teacher Lebih');
      expect(result[0].status).toEqual('lebih');
    });
  });

  describe('getWorkloadValidationSummary', () => {
    it('should return correct summary statistics', async () => {
      // Create teachers with different workloads
      const teacher2 = await db.insert(teachersTable)
        .values({
          name: 'Teacher 2',
          nip_nuptk: '111111111',
          tmt: new Date('2020-01-01'),
          education: 'S1'
        })
        .returning()
        .execute();

      const teacher3 = await db.insert(teachersTable)
        .values({
          name: 'Teacher 3',
          nip_nuptk: '222222222',
          tmt: new Date('2020-01-01'),
          education: 'S1'
        })
        .returning()
        .execute();

      // Create assignments: 10, 30, 45 hours
      await db.insert(jtmAssignmentsTable)
        .values([
          {
            academic_year_id: academicYearId,
            teacher_id: teacherId,
            subject_id: subjectId,
            class_id: classId,
            allocated_hours: 10
          },
          {
            academic_year_id: academicYearId,
            teacher_id: teacher2[0].id,
            subject_id: subjectId,
            class_id: classId,
            allocated_hours: 30
          },
          {
            academic_year_id: academicYearId,
            teacher_id: teacher3[0].id,
            subject_id: subjectId,
            class_id: classId,
            allocated_hours: 45
          }
        ])
        .execute();

      const result = await getWorkloadValidationSummary(academicYearId);

      expect(result.total_teachers).toEqual(3);
      expect(result.kurang_count).toEqual(1);
      expect(result.layak_count).toEqual(1);
      expect(result.lebih_count).toEqual(1);
      expect(result.average_workload).toBeCloseTo(28.33, 1); // (10+30+45)/3
    });

    it('should return zero summary for academic year with no teachers', async () => {
      const result = await getWorkloadValidationSummary(999);

      expect(result.total_teachers).toEqual(0);
      expect(result.kurang_count).toEqual(0);
      expect(result.layak_count).toEqual(0);
      expect(result.lebih_count).toEqual(0);
      expect(result.average_workload).toEqual(0);
    });
  });

  describe('getTeacherWorkloadDetails', () => {
    it('should return detailed teacher workload breakdown', async () => {
      // Create JTM assignment
      await db.insert(jtmAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          allocated_hours: 20
        })
        .execute();

      // Create task assignment
      await db.insert(taskAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          task_id: taskId,
          description: 'Managing class 7A'
        })
        .execute();

      const result = await getTeacherWorkloadDetails(teacherId, academicYearId);

      // Teacher info
      expect(result.teacher.id).toEqual(teacherId);
      expect(result.teacher.name).toEqual('John Doe');
      expect(result.teacher.nip_nuptk).toEqual('123456789');

      // JTM assignments
      expect(result.jtm_assignments).toHaveLength(1);
      expect(result.jtm_assignments[0].subject_name).toEqual('Matematika');
      expect(result.jtm_assignments[0].class_name).toEqual('7A');
      expect(result.jtm_assignments[0].allocated_hours).toEqual(20);

      // Task assignments
      expect(result.task_assignments).toHaveLength(1);
      expect(result.task_assignments[0].task_name).toEqual('Wali Kelas');
      expect(result.task_assignments[0].jp_equivalent).toEqual(4);
      expect(result.task_assignments[0].description).toEqual('Managing class 7A');

      // Summary
      expect(result.summary.total_jtm).toEqual(20);
      expect(result.summary.total_tasks).toEqual(4);
      expect(result.summary.total_workload).toEqual(24);
      expect(result.summary.status).toEqual('layak');
      expect(result.summary.minimum_required).toEqual(24);
      expect(result.summary.surplus_deficit).toEqual(0);
    });

    it('should handle teacher with no assignments', async () => {
      const result = await getTeacherWorkloadDetails(teacherId, academicYearId);

      expect(result.jtm_assignments).toHaveLength(0);
      expect(result.task_assignments).toHaveLength(0);
      expect(result.summary.total_jtm).toEqual(0);
      expect(result.summary.total_tasks).toEqual(0);
      expect(result.summary.total_workload).toEqual(0);
      expect(result.summary.status).toEqual('kurang');
      expect(result.summary.surplus_deficit).toEqual(-24);
    });

    it('should throw error for non-existent teacher', async () => {
      await expect(getTeacherWorkloadDetails(999, academicYearId))
        .rejects.toThrow(/Teacher with id 999 not found/);
    });

    it('should handle decimal jp_equivalent correctly', async () => {
      // Create task with decimal jp_equivalent
      const decimalTask = await db.insert(additionalTasksTable)
        .values({
          name: 'Pembina UKS',
          description: 'Pembina unit kesehatan sekolah',
          jp_equivalent: '2.50'
        })
        .returning()
        .execute();

      await db.insert(taskAssignmentsTable)
        .values({
          academic_year_id: academicYearId,
          teacher_id: teacherId,
          task_id: decimalTask[0].id
        })
        .execute();

      const result = await getTeacherWorkloadDetails(teacherId, academicYearId);

      expect(result.task_assignments[0].jp_equivalent).toEqual(2.5);
      expect(result.summary.total_tasks).toEqual(2.5);
      expect(result.summary.total_workload).toEqual(2.5);
    });
  });
});