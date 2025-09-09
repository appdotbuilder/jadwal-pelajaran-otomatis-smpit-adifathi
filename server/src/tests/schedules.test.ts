import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  schedulesTable, 
  academicYearsTable, 
  classesTable, 
  scheduleTemplatesTable,
  subjectsTable,
  teachersTable
} from '../db/schema';
import { type CreateScheduleInput } from '../schema';
import { createSchedule } from '../handlers/schedules';
import { eq } from 'drizzle-orm';

describe('createSchedule', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let academicYearId: number;
  let classId: number;
  let templateId: number;
  let subjectId: number;
  let teacherId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const academicYear = await db.insert(academicYearsTable)
      .values({
        year: '2024/2025',
        semester: 1,
        curriculum: 'Kurikulum Merdeka',
        total_time_allocation: 45,
        is_active: true
      })
      .returning()
      .execute();
    academicYearId = academicYear[0].id;

    const classRecord = await db.insert(classesTable)
      .values({
        grade_level: 7,
        rombel: 'A',
        class_name: '7A',
        academic_year_id: academicYearId
      })
      .returning()
      .execute();
    classId = classRecord[0].id;

    const template = await db.insert(scheduleTemplatesTable)
      .values({
        name: 'Template Standar',
        description: 'Template jadwal standar untuk SMP'
      })
      .returning()
      .execute();
    templateId = template[0].id;

    const subject = await db.insert(subjectsTable)
      .values({
        code: 'MAT',
        name: 'Matematika',
        time_allocation: 4
      })
      .returning()
      .execute();
    subjectId = subject[0].id;

    const teacher = await db.insert(teachersTable)
      .values({
        name: 'Budi Santoso',
        nip_nuptk: '123456789',
        tmt: new Date('2020-01-01'),
        education: 'S1 Matematika'
      })
      .returning()
      .execute();
    teacherId = teacher[0].id;
  });

  // Test input with all required fields and optional subject/teacher
  const testInput: CreateScheduleInput = {
    academic_year_id: 0, // Will be set in test
    class_id: 0, // Will be set in test
    template_id: 0, // Will be set in test
    day_of_week: 1, // Monday
    jp_number: 1,
    subject_id: 0, // Will be set in test
    teacher_id: 0, // Will be set in test
    is_manual: true,
    is_cached: false
  };

  it('should create a schedule with all fields', async () => {
    const input = {
      ...testInput,
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      subject_id: subjectId,
      teacher_id: teacherId
    };

    const result = await createSchedule(input);

    // Basic field validation
    expect(result.academic_year_id).toEqual(academicYearId);
    expect(result.class_id).toEqual(classId);
    expect(result.template_id).toEqual(templateId);
    expect(result.day_of_week).toEqual(1);
    expect(result.jp_number).toEqual(1);
    expect(result.subject_id).toEqual(subjectId);
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.is_manual).toEqual(true);
    expect(result.is_cached).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a schedule with null subject and teacher', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      day_of_week: 2, // Tuesday
      jp_number: 2,
      subject_id: null,
      teacher_id: null,
      is_manual: true,
      is_cached: true
    };

    const result = await createSchedule(input);

    expect(result.subject_id).toBeNull();
    expect(result.teacher_id).toBeNull();
    expect(result.day_of_week).toEqual(2);
    expect(result.jp_number).toEqual(2);
    expect(result.is_cached).toEqual(true);
  });

  it('should create a schedule without optional fields', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      day_of_week: 3, // Wednesday
      jp_number: 3,
      is_manual: false
    };

    const result = await createSchedule(input);

    expect(result.subject_id).toBeNull();
    expect(result.teacher_id).toBeNull();
    expect(result.is_manual).toEqual(false);
    expect(result.is_cached).toEqual(true); // Default value from Zod
  });

  it('should save schedule to database', async () => {
    const input = {
      ...testInput,
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      subject_id: subjectId,
      teacher_id: teacherId
    };

    const result = await createSchedule(input);

    // Query database to verify schedule was saved
    const schedules = await db.select()
      .from(schedulesTable)
      .where(eq(schedulesTable.id, result.id))
      .execute();

    expect(schedules).toHaveLength(1);
    expect(schedules[0].academic_year_id).toEqual(academicYearId);
    expect(schedules[0].class_id).toEqual(classId);
    expect(schedules[0].template_id).toEqual(templateId);
    expect(schedules[0].day_of_week).toEqual(1);
    expect(schedules[0].jp_number).toEqual(1);
    expect(schedules[0].subject_id).toEqual(subjectId);
    expect(schedules[0].teacher_id).toEqual(teacherId);
    expect(schedules[0].is_manual).toEqual(true);
    expect(schedules[0].is_cached).toEqual(false);
    expect(schedules[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple schedule entries for same class', async () => {
    const baseInput = {
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      subject_id: subjectId,
      teacher_id: teacherId,
      is_manual: true
    };

    // Create multiple schedules
    const schedule1 = await createSchedule({
      ...baseInput,
      day_of_week: 1,
      jp_number: 1
    });

    const schedule2 = await createSchedule({
      ...baseInput,
      day_of_week: 1,
      jp_number: 2
    });

    const schedule3 = await createSchedule({
      ...baseInput,
      day_of_week: 2,
      jp_number: 1
    });

    // Verify all schedules were created with different IDs
    expect(schedule1.id).not.toEqual(schedule2.id);
    expect(schedule1.id).not.toEqual(schedule3.id);
    expect(schedule2.id).not.toEqual(schedule3.id);

    // Verify all schedules exist in database
    const allSchedules = await db.select()
      .from(schedulesTable)
      .where(eq(schedulesTable.class_id, classId))
      .execute();

    expect(allSchedules).toHaveLength(3);
  });

  it('should throw error for invalid academic_year_id', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: 99999, // Non-existent ID
      class_id: classId,
      template_id: templateId,
      day_of_week: 1,
      jp_number: 1,
      is_manual: true
    };

    await expect(createSchedule(input)).rejects.toThrow(/academic year.*not found/i);
  });

  it('should throw error for invalid class_id', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: academicYearId,
      class_id: 99999, // Non-existent ID
      template_id: templateId,
      day_of_week: 1,
      jp_number: 1,
      is_manual: true
    };

    await expect(createSchedule(input)).rejects.toThrow(/class.*not found/i);
  });

  it('should throw error for invalid template_id', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: 99999, // Non-existent ID
      day_of_week: 1,
      jp_number: 1,
      is_manual: true
    };

    await expect(createSchedule(input)).rejects.toThrow(/schedule template.*not found/i);
  });

  it('should throw error for invalid subject_id when provided', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      day_of_week: 1,
      jp_number: 1,
      subject_id: 99999, // Non-existent ID
      is_manual: true
    };

    await expect(createSchedule(input)).rejects.toThrow(/subject.*not found/i);
  });

  it('should throw error for invalid teacher_id when provided', async () => {
    const input: CreateScheduleInput = {
      academic_year_id: academicYearId,
      class_id: classId,
      template_id: templateId,
      day_of_week: 1,
      jp_number: 1,
      teacher_id: 99999, // Non-existent ID
      is_manual: true
    };

    await expect(createSchedule(input)).rejects.toThrow(/teacher.*not found/i);
  });

  it('should create schedule with valid day_of_week and jp_number ranges', async () => {
    // Test boundary values
    const testCases = [
      { day_of_week: 1, jp_number: 1 }, // Minimum values
      { day_of_week: 5, jp_number: 10 }, // Maximum typical values
      { day_of_week: 3, jp_number: 8 } // Middle values
    ];

    for (const testCase of testCases) {
      const input: CreateScheduleInput = {
        academic_year_id: academicYearId,
        class_id: classId,
        template_id: templateId,
        day_of_week: testCase.day_of_week,
        jp_number: testCase.jp_number,
        is_manual: true
      };

      const result = await createSchedule(input);
      expect(result.day_of_week).toEqual(testCase.day_of_week);
      expect(result.jp_number).toEqual(testCase.jp_number);
    }
  });
});