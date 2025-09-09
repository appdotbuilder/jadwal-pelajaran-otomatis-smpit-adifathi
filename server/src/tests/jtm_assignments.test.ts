import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  jtmAssignmentsTable, 
  teachersTable, 
  subjectsTable, 
  classesTable, 
  academicYearsTable 
} from '../db/schema';
import { type CreateJtmAssignmentInput } from '../schema';
import {
  createJtmAssignment,
  getJtmAssignmentsByAcademicYear,
  getJtmAssignmentsByTeacher,
  getJtmAssignmentsByClass,
  getJtmAssignmentById,
  updateJtmAssignment,
  deleteJtmAssignment,
  getJtmAllocationProgress,
  validateJtmAllocation
} from '../handlers/jtm_assignments';
import { eq } from 'drizzle-orm';

// Test setup data
let academicYearId: number;
let teacherId: number;
let subjectId: number;
let classId: number;

const setupTestData = async () => {
  // Create academic year
  const academicYear = await db.insert(academicYearsTable)
    .values({
      year: '2024/2025',
      semester: 1,
      curriculum: 'Kurikulum Merdeka',
      total_time_allocation: 38,
      is_active: true
    })
    .returning()
    .execute();
  academicYearId = academicYear[0].id;

  // Create teacher
  const teacher = await db.insert(teachersTable)
    .values({
      name: 'Test Teacher',
      nip_nuptk: '123456789',
      tmt: new Date('2020-01-01'),
      education: 'S1 Pendidikan Matematika'
    })
    .returning()
    .execute();
  teacherId = teacher[0].id;

  // Create subject
  const subject = await db.insert(subjectsTable)
    .values({
      code: 'MTK',
      name: 'Matematika',
      time_allocation: 4
    })
    .returning()
    .execute();
  subjectId = subject[0].id;

  // Create class
  const classEntity = await db.insert(classesTable)
    .values({
      grade_level: 7,
      rombel: 'A',
      class_name: '7A',
      academic_year_id: academicYearId
    })
    .returning()
    .execute();
  classId = classEntity[0].id;
};

const testInput: CreateJtmAssignmentInput = {
  academic_year_id: 0, // Will be set in beforeEach
  teacher_id: 0, // Will be set in beforeEach
  subject_id: 0, // Will be set in beforeEach
  class_id: 0, // Will be set in beforeEach
  allocated_hours: 4
};

describe('createJtmAssignment', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should create a JTM assignment', async () => {
    const result = await createJtmAssignment(testInput);

    expect(result.academic_year_id).toEqual(academicYearId);
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.subject_id).toEqual(subjectId);
    expect(result.class_id).toEqual(classId);
    expect(result.allocated_hours).toEqual(4);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save JTM assignment to database', async () => {
    const result = await createJtmAssignment(testInput);

    const assignments = await db.select()
      .from(jtmAssignmentsTable)
      .where(eq(jtmAssignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].academic_year_id).toEqual(academicYearId);
    expect(assignments[0].teacher_id).toEqual(teacherId);
    expect(assignments[0].subject_id).toEqual(subjectId);
    expect(assignments[0].class_id).toEqual(classId);
    expect(assignments[0].allocated_hours).toEqual(4);
  });

  it('should throw error for non-existent academic year', async () => {
    const invalidInput = { ...testInput, academic_year_id: 999 };

    await expect(createJtmAssignment(invalidInput)).rejects.toThrow(/Academic year with id 999 not found/);
  });

  it('should throw error for non-existent teacher', async () => {
    const invalidInput = { ...testInput, teacher_id: 999 };

    await expect(createJtmAssignment(invalidInput)).rejects.toThrow(/Teacher with id 999 not found/);
  });

  it('should throw error for non-existent subject', async () => {
    const invalidInput = { ...testInput, subject_id: 999 };

    await expect(createJtmAssignment(invalidInput)).rejects.toThrow(/Subject with id 999 not found/);
  });

  it('should throw error for non-existent class', async () => {
    const invalidInput = { ...testInput, class_id: 999 };

    await expect(createJtmAssignment(invalidInput)).rejects.toThrow(/Class with id 999 not found/);
  });
});

describe('getJtmAssignmentsByAcademicYear', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should return empty array when no assignments exist', async () => {
    const result = await getJtmAssignmentsByAcademicYear(academicYearId);

    expect(result).toEqual([]);
  });

  it('should return JTM assignments for specific academic year', async () => {
    await createJtmAssignment(testInput);

    const result = await getJtmAssignmentsByAcademicYear(academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].academic_year_id).toEqual(academicYearId);
    expect(result[0].allocated_hours).toEqual(4);
  });

  it('should not return assignments from other academic years', async () => {
    // Create another academic year
    const otherAcademicYear = await db.insert(academicYearsTable)
      .values({
        year: '2025/2026',
        semester: 1,
        curriculum: 'Kurikulum Merdeka',
        total_time_allocation: 38,
        is_active: false
      })
      .returning()
      .execute();

    await createJtmAssignment(testInput);
    await createJtmAssignment({ ...testInput, academic_year_id: otherAcademicYear[0].id });

    const result = await getJtmAssignmentsByAcademicYear(academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].academic_year_id).toEqual(academicYearId);
  });
});

describe('getJtmAssignmentsByTeacher', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should return empty array when teacher has no assignments', async () => {
    const result = await getJtmAssignmentsByTeacher(teacherId, academicYearId);

    expect(result).toEqual([]);
  });

  it('should return JTM assignments for specific teacher', async () => {
    await createJtmAssignment(testInput);

    const result = await getJtmAssignmentsByTeacher(teacherId, academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].teacher_id).toEqual(teacherId);
    expect(result[0].academic_year_id).toEqual(academicYearId);
  });

  it('should not return assignments from other teachers', async () => {
    // Create another teacher
    const otherTeacher = await db.insert(teachersTable)
      .values({
        name: 'Other Teacher',
        nip_nuptk: '987654321',
        tmt: new Date('2021-01-01'),
        education: 'S1 Pendidikan Bahasa Indonesia'
      })
      .returning()
      .execute();

    await createJtmAssignment(testInput);
    await createJtmAssignment({ ...testInput, teacher_id: otherTeacher[0].id });

    const result = await getJtmAssignmentsByTeacher(teacherId, academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].teacher_id).toEqual(teacherId);
  });
});

describe('getJtmAssignmentsByClass', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should return empty array when class has no assignments', async () => {
    const result = await getJtmAssignmentsByClass(classId, academicYearId);

    expect(result).toEqual([]);
  });

  it('should return JTM assignments for specific class', async () => {
    await createJtmAssignment(testInput);

    const result = await getJtmAssignmentsByClass(classId, academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].class_id).toEqual(classId);
    expect(result[0].academic_year_id).toEqual(academicYearId);
  });
});

describe('getJtmAssignmentById', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should return null for non-existent assignment', async () => {
    const result = await getJtmAssignmentById(999);

    expect(result).toBeNull();
  });

  it('should return JTM assignment by ID', async () => {
    const created = await createJtmAssignment(testInput);

    const result = await getJtmAssignmentById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.allocated_hours).toEqual(4);
  });
});

describe('updateJtmAssignment', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should update JTM assignment allocated hours', async () => {
    const created = await createJtmAssignment(testInput);

    const result = await updateJtmAssignment({
      id: created.id,
      allocated_hours: 6
    });

    expect(result.id).toEqual(created.id);
    expect(result.allocated_hours).toEqual(6);
    expect(result.updated_at).not.toEqual(created.updated_at);
  });

  it('should throw error for non-existent assignment', async () => {
    await expect(updateJtmAssignment({
      id: 999,
      allocated_hours: 6
    })).rejects.toThrow(/JTM assignment with id 999 not found/);
  });

  it('should validate referenced entities when updating', async () => {
    const created = await createJtmAssignment(testInput);

    await expect(updateJtmAssignment({
      id: created.id,
      teacher_id: 999
    })).rejects.toThrow(/Teacher with id 999 not found/);
  });
});

describe('deleteJtmAssignment', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should delete JTM assignment', async () => {
    const created = await createJtmAssignment(testInput);

    const result = await deleteJtmAssignment(created.id);

    expect(result).toBe(true);

    const deleted = await getJtmAssignmentById(created.id);
    expect(deleted).toBeNull();
  });

  it('should return false for non-existent assignment', async () => {
    const result = await deleteJtmAssignment(999);

    expect(result).toBe(false);
  });
});

describe('getJtmAllocationProgress', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should return progress for classes with no assignments', async () => {
    const result = await getJtmAllocationProgress(academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].class_id).toEqual(classId);
    expect(result[0].class_name).toEqual('7A');
    expect(result[0].total_allocated).toEqual(0);
    expect(result[0].curriculum_limit).toEqual(38);
    expect(result[0].progress_percentage).toEqual(0);
    expect(result[0].subjects).toHaveLength(0);
  });

  it('should calculate progress correctly with assignments', async () => {
    await createJtmAssignment(testInput);

    const result = await getJtmAllocationProgress(academicYearId);

    expect(result).toHaveLength(1);
    expect(result[0].total_allocated).toEqual(4);
    expect(result[0].progress_percentage).toBeCloseTo(10.53, 2); // 4/38 * 100
    expect(result[0].subjects).toHaveLength(1);
    expect(result[0].subjects[0].subject_name).toEqual('Matematika');
    expect(result[0].subjects[0].allocated_hours).toEqual(4);
  });

  it('should throw error for non-existent academic year', async () => {
    await expect(getJtmAllocationProgress(999)).rejects.toThrow(/Academic year with id 999 not found/);
  });
});

describe('validateJtmAllocation', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
    testInput.academic_year_id = academicYearId;
    testInput.teacher_id = teacherId;
    testInput.subject_id = subjectId;
    testInput.class_id = classId;
  });
  afterEach(resetDB);

  it('should validate valid allocation', async () => {
    const result = await validateJtmAllocation(testInput);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should return error for allocation exceeding curriculum limit', async () => {
    const invalidInput = { ...testInput, allocated_hours: 50 }; // Exceeds 38 hour limit

    const result = await validateJtmAllocation(invalidInput);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/exceeds curriculum limit/);
  });

  it('should return warning when approaching curriculum limit', async () => {
    const warningInput = { ...testInput, allocated_hours: 35 }; // 35/38 > 90%

    const result = await validateJtmAllocation(warningInput);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/approaching curriculum limit/);
  });

  it('should detect duplicate assignment', async () => {
    await createJtmAssignment(testInput);

    const result = await validateJtmAllocation(testInput);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/already assigned/);
  });

  it('should return error for non-existent academic year', async () => {
    const invalidInput = { ...testInput, academic_year_id: 999 };

    const result = await validateJtmAllocation(invalidInput);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Academic year with id 999 not found/);
  });

  it('should check cumulative allocation when existing assignments present', async () => {
    // Create first assignment with 20 hours
    await createJtmAssignment({ ...testInput, allocated_hours: 20 });

    // Try to create second assignment with 25 hours (total would be 45, exceeding 38)
    const newInput = { 
      ...testInput, 
      allocated_hours: 25,
      teacher_id: teacherId + 1 // Different teacher to avoid duplicate error
    };

    // Create another teacher first
    await db.insert(teachersTable)
      .values({
        name: 'Another Teacher',
        nip_nuptk: '111222333',
        tmt: new Date('2022-01-01'),
        education: 'S1 Pendidikan IPA'
      })
      .execute();

    const result = await validateJtmAllocation(newInput);

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/Total allocation \(45 hours\) exceeds curriculum limit/);
  });
});