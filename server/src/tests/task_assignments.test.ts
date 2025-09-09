import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  taskAssignmentsTable, 
  teachersTable, 
  additionalTasksTable,
  academicYearsTable 
} from '../db/schema';
import { type CreateTaskAssignmentInput } from '../schema';
import {
  createTaskAssignment,
  getTaskAssignmentsByAcademicYear,
  getTaskAssignmentsByTeacher,
  getTaskAssignmentById,
  updateTaskAssignment,
  deleteTaskAssignment,
  getTaskAllocationChartData
} from '../handlers/task_assignments';
import { eq } from 'drizzle-orm';

describe('Task Assignments Handler', () => {
  let academicYearId: number;
  let teacherId: number;
  let taskId: number;
  let secondTeacherId: number;
  let secondTaskId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const academicYear = await db.insert(academicYearsTable)
      .values({
        year: '2024/2025',
        semester: 1,
        curriculum: 'Kurikulum Merdeka',
        total_time_allocation: 40,
        is_active: true
      })
      .returning()
      .execute();
    academicYearId = academicYear[0].id;

    const teacher = await db.insert(teachersTable)
      .values({
        name: 'John Teacher',
        nip_nuptk: '123456789',
        tmt: new Date('2020-01-01'),
        education: 'S1 Pendidikan'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;

    const secondTeacher = await db.insert(teachersTable)
      .values({
        name: 'Jane Teacher',
        nip_nuptk: '987654321',
        tmt: new Date('2019-01-01'),
        education: 'S1 Pendidikan'
      })
      .returning()
      .execute();
    secondTeacherId = secondTeacher[0].id;

    const task = await db.insert(additionalTasksTable)
      .values({
        name: 'Wali Kelas',
        description: 'Tugas sebagai wali kelas',
        jp_equivalent: '2.50'
      })
      .returning()
      .execute();
    taskId = task[0].id;

    const secondTask = await db.insert(additionalTasksTable)
      .values({
        name: 'Kepala Perpustakaan',
        description: 'Tugas sebagai kepala perpustakaan',
        jp_equivalent: '4.00'
      })
      .returning()
      .execute();
    secondTaskId = secondTask[0].id;
  });

  afterEach(resetDB);

  describe('createTaskAssignment', () => {
    it('should create a task assignment successfully', async () => {
      const input: CreateTaskAssignmentInput = {
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId,
        description: 'Wali kelas 7A'
      };

      const result = await createTaskAssignment(input);

      expect(result.id).toBeDefined();
      expect(result.academic_year_id).toBe(academicYearId);
      expect(result.teacher_id).toBe(teacherId);
      expect(result.task_id).toBe(taskId);
      expect(result.description).toBe('Wali kelas 7A');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create task assignment without description', async () => {
      const input: CreateTaskAssignmentInput = {
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId
      };

      const result = await createTaskAssignment(input);

      expect(result.description).toBeNull();
      expect(result.teacher_id).toBe(teacherId);
      expect(result.task_id).toBe(taskId);
    });

    it('should save task assignment to database', async () => {
      const input: CreateTaskAssignmentInput = {
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId,
        description: 'Test assignment'
      };

      const result = await createTaskAssignment(input);

      const assignments = await db.select()
        .from(taskAssignmentsTable)
        .where(eq(taskAssignmentsTable.id, result.id))
        .execute();

      expect(assignments).toHaveLength(1);
      expect(assignments[0].academic_year_id).toBe(academicYearId);
      expect(assignments[0].teacher_id).toBe(teacherId);
      expect(assignments[0].task_id).toBe(taskId);
      expect(assignments[0].description).toBe('Test assignment');
    });

    it('should throw error for non-existent academic year', async () => {
      const input: CreateTaskAssignmentInput = {
        academic_year_id: 99999,
        teacher_id: teacherId,
        task_id: taskId
      };

      await expect(createTaskAssignment(input)).rejects.toThrow(/Academic year with id 99999 not found/i);
    });

    it('should throw error for non-existent teacher', async () => {
      const input: CreateTaskAssignmentInput = {
        academic_year_id: academicYearId,
        teacher_id: 99999,
        task_id: taskId
      };

      await expect(createTaskAssignment(input)).rejects.toThrow(/Teacher with id 99999 not found/i);
    });

    it('should throw error for non-existent task', async () => {
      const input: CreateTaskAssignmentInput = {
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: 99999
      };

      await expect(createTaskAssignment(input)).rejects.toThrow(/Additional task with id 99999 not found/i);
    });
  });

  describe('getTaskAssignmentsByAcademicYear', () => {
    it('should return assignments for specific academic year', async () => {
      // Create test assignments
      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId
      });

      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: secondTeacherId,
        task_id: secondTaskId
      });

      const results = await getTaskAssignmentsByAcademicYear(academicYearId);

      expect(results).toHaveLength(2);
      expect(results.every(assignment => assignment.academic_year_id === academicYearId)).toBe(true);
    });

    it('should return empty array for academic year with no assignments', async () => {
      const results = await getTaskAssignmentsByAcademicYear(academicYearId);

      expect(results).toHaveLength(0);
    });
  });

  describe('getTaskAssignmentsByTeacher', () => {
    it('should return assignments for specific teacher in academic year', async () => {
      // Create assignments for different teachers
      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId
      });

      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: secondTeacherId,
        task_id: secondTaskId
      });

      const results = await getTaskAssignmentsByTeacher(teacherId, academicYearId);

      expect(results).toHaveLength(1);
      expect(results[0].teacher_id).toBe(teacherId);
      expect(results[0].academic_year_id).toBe(academicYearId);
    });

    it('should return empty array for teacher with no assignments', async () => {
      const results = await getTaskAssignmentsByTeacher(teacherId, academicYearId);

      expect(results).toHaveLength(0);
    });
  });

  describe('getTaskAssignmentById', () => {
    it('should return task assignment by ID', async () => {
      const created = await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId,
        description: 'Test assignment'
      });

      const result = await getTaskAssignmentById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.academic_year_id).toBe(academicYearId);
      expect(result!.teacher_id).toBe(teacherId);
      expect(result!.task_id).toBe(taskId);
      expect(result!.description).toBe('Test assignment');
    });

    it('should return null for non-existent ID', async () => {
      const result = await getTaskAssignmentById(99999);

      expect(result).toBeNull();
    });
  });

  describe('updateTaskAssignment', () => {
    it('should update task assignment successfully', async () => {
      const created = await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId,
        description: 'Original description'
      });

      const updated = await updateTaskAssignment({
        id: created.id,
        description: 'Updated description',
        teacher_id: secondTeacherId
      });

      expect(updated.id).toBe(created.id);
      expect(updated.description).toBe('Updated description');
      expect(updated.teacher_id).toBe(secondTeacherId);
      expect(updated.task_id).toBe(taskId); // Unchanged
      expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update only specified fields', async () => {
      const created = await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId,
        description: 'Original description'
      });

      const updated = await updateTaskAssignment({
        id: created.id,
        description: 'Only description updated'
      });

      expect(updated.description).toBe('Only description updated');
      expect(updated.teacher_id).toBe(teacherId); // Unchanged
      expect(updated.task_id).toBe(taskId); // Unchanged
      expect(updated.academic_year_id).toBe(academicYearId); // Unchanged
    });

    it('should throw error for non-existent assignment', async () => {
      await expect(updateTaskAssignment({
        id: 99999,
        description: 'Updated'
      })).rejects.toThrow(/Task assignment with id 99999 not found/i);
    });

    it('should throw error when updating to non-existent teacher', async () => {
      const created = await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId
      });

      await expect(updateTaskAssignment({
        id: created.id,
        teacher_id: 99999
      })).rejects.toThrow(/Teacher with id 99999 not found/i);
    });
  });

  describe('deleteTaskAssignment', () => {
    it('should delete task assignment successfully', async () => {
      const created = await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId
      });

      const result = await deleteTaskAssignment(created.id);

      expect(result).toBe(true);

      // Verify deletion
      const deleted = await getTaskAssignmentById(created.id);
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent assignment', async () => {
      await expect(deleteTaskAssignment(99999)).rejects.toThrow(/Task assignment with id 99999 not found/i);
    });
  });

  describe('getTaskAllocationChartData', () => {
    it('should return task allocation chart data', async () => {
      // Create multiple assignments
      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: taskId,
        description: 'Wali kelas 7A'
      });

      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: secondTeacherId,
        task_id: taskId,
        description: 'Wali kelas 7B'
      });

      await createTaskAssignment({
        academic_year_id: academicYearId,
        teacher_id: teacherId,
        task_id: secondTaskId,
        description: 'Kepala perpus'
      });

      const results = await getTaskAllocationChartData(academicYearId);

      expect(results).toHaveLength(2); // 2 distinct tasks

      // Find the "Wali Kelas" task
      const waliKelasTask = results.find(task => task.task_name === 'Wali Kelas');
      expect(waliKelasTask).toBeDefined();
      expect(waliKelasTask!.task_equivalent).toBe(2.5);
      expect(waliKelasTask!.assigned_count).toBe(2);
      expect(waliKelasTask!.total_equivalent).toBe(5.0); // 2.5 * 2
      expect(waliKelasTask!.teachers).toHaveLength(2);
      expect(waliKelasTask!.teachers.some(t => t.teacher_name === 'John Teacher')).toBe(true);
      expect(waliKelasTask!.teachers.some(t => t.teacher_name === 'Jane Teacher')).toBe(true);

      // Find the "Kepala Perpustakaan" task
      const perpusTask = results.find(task => task.task_name === 'Kepala Perpustakaan');
      expect(perpusTask).toBeDefined();
      expect(perpusTask!.task_equivalent).toBe(4.0);
      expect(perpusTask!.assigned_count).toBe(1);
      expect(perpusTask!.total_equivalent).toBe(4.0);
      expect(perpusTask!.teachers).toHaveLength(1);
      expect(perpusTask!.teachers[0].teacher_name).toBe('John Teacher');
    });

    it('should include tasks with no assignments', async () => {
      const results = await getTaskAllocationChartData(academicYearId);

      expect(results).toHaveLength(2); // Both tasks should be included
      results.forEach(task => {
        expect(task.assigned_count).toBe(0);
        expect(task.total_equivalent).toBe(0);
        expect(task.teachers).toHaveLength(0);
        expect(typeof task.task_equivalent).toBe('number');
      });
    });

    it('should handle academic year with no assignments', async () => {
      const results = await getTaskAllocationChartData(academicYearId);

      expect(results).toHaveLength(2); // All tasks should be included even with no assignments
      results.forEach(task => {
        expect(task.assigned_count).toBe(0);
        expect(task.teachers).toHaveLength(0);
      });
    });
  });
});