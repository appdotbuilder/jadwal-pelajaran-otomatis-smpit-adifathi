import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { classesTable, academicYearsTable } from '../db/schema';
import { type CreateClassInput, type UpdateClassInput } from '../schema';
import { 
  createClass, 
  getClasses, 
  getClassesByAcademicYear,
  getClassById, 
  updateClass, 
  deleteClass 
} from '../handlers/classes';
import { eq } from 'drizzle-orm';

// Test data
const testAcademicYear = {
  year: '2024/2025',
  semester: 1,
  curriculum: 'Kurikulum Merdeka',
  total_time_allocation: 40,
  is_active: true
};

const testClassInput: CreateClassInput = {
  grade_level: 7,
  rombel: 'A',
  class_name: '7A',
  academic_year_id: 1 // Will be set after creating academic year
};

describe('Classes Handler', () => {
  let academicYearId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite academic year
    const academicYearResult = await db.insert(academicYearsTable)
      .values(testAcademicYear)
      .returning()
      .execute();
    
    academicYearId = academicYearResult[0].id;
    testClassInput.academic_year_id = academicYearId;
  });

  afterEach(resetDB);

  describe('createClass', () => {
    it('should create a class', async () => {
      const result = await createClass(testClassInput);

      // Basic field validation
      expect(result.grade_level).toEqual(7);
      expect(result.rombel).toEqual('A');
      expect(result.class_name).toEqual('7A');
      expect(result.academic_year_id).toEqual(academicYearId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save class to database', async () => {
      const result = await createClass(testClassInput);

      // Verify in database
      const classes = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, result.id))
        .execute();

      expect(classes).toHaveLength(1);
      expect(classes[0].grade_level).toEqual(7);
      expect(classes[0].rombel).toEqual('A');
      expect(classes[0].class_name).toEqual('7A');
      expect(classes[0].academic_year_id).toEqual(academicYearId);
    });

    it('should throw error for invalid academic year', async () => {
      const invalidInput = {
        ...testClassInput,
        academic_year_id: 999
      };

      await expect(createClass(invalidInput)).rejects.toThrow(/Academic year with ID 999 not found/i);
    });

    it('should create classes with different grade levels', async () => {
      const class8Input = {
        ...testClassInput,
        grade_level: 8,
        class_name: '8A'
      };

      const class9Input = {
        ...testClassInput,
        grade_level: 9,
        class_name: '9A'
      };

      const result7 = await createClass(testClassInput);
      const result8 = await createClass(class8Input);
      const result9 = await createClass(class9Input);

      expect(result7.grade_level).toEqual(7);
      expect(result8.grade_level).toEqual(8);
      expect(result9.grade_level).toEqual(9);
    });
  });

  describe('getClasses', () => {
    it('should return empty array when no classes exist', async () => {
      const result = await getClasses();
      expect(result).toEqual([]);
    });

    it('should return all classes', async () => {
      // Create multiple classes
      await createClass(testClassInput);
      await createClass({
        ...testClassInput,
        grade_level: 8,
        rombel: 'B',
        class_name: '8B'
      });

      const result = await getClasses();

      expect(result).toHaveLength(2);
      expect(result[0].class_name).toEqual('7A');
      expect(result[1].class_name).toEqual('8B');
    });
  });

  describe('getClassesByAcademicYear', () => {
    it('should return empty array when no classes exist for academic year', async () => {
      const result = await getClassesByAcademicYear(academicYearId);
      expect(result).toEqual([]);
    });

    it('should return classes for specific academic year', async () => {
      // Create another academic year
      const academicYear2 = await db.insert(academicYearsTable)
        .values({
          ...testAcademicYear,
          year: '2025/2026'
        })
        .returning()
        .execute();

      const academicYear2Id = academicYear2[0].id;

      // Create classes for both academic years
      await createClass(testClassInput);
      await createClass({
        ...testClassInput,
        academic_year_id: academicYear2Id,
        class_name: '7A-2025'
      });

      const resultYear1 = await getClassesByAcademicYear(academicYearId);
      const resultYear2 = await getClassesByAcademicYear(academicYear2Id);

      expect(resultYear1).toHaveLength(1);
      expect(resultYear1[0].class_name).toEqual('7A');
      expect(resultYear2).toHaveLength(1);
      expect(resultYear2[0].class_name).toEqual('7A-2025');
    });
  });

  describe('getClassById', () => {
    it('should return null for non-existent class', async () => {
      const result = await getClassById(999);
      expect(result).toBeNull();
    });

    it('should return class by ID', async () => {
      const created = await createClass(testClassInput);
      const result = await getClassById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.class_name).toEqual('7A');
      expect(result!.grade_level).toEqual(7);
      expect(result!.academic_year_id).toEqual(academicYearId);
    });
  });

  describe('updateClass', () => {
    it('should throw error for non-existent class', async () => {
      const updateInput: UpdateClassInput = {
        id: 999,
        class_name: 'Updated Class'
      };

      await expect(updateClass(updateInput)).rejects.toThrow(/Class with ID 999 not found/i);
    });

    it('should update class information', async () => {
      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        grade_level: 8,
        rombel: 'B',
        class_name: '8B'
      };

      const result = await updateClass(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.grade_level).toEqual(8);
      expect(result.rombel).toEqual('B');
      expect(result.class_name).toEqual('8B');
      expect(result.academic_year_id).toEqual(academicYearId); // Should remain unchanged
    });

    it('should update partial class information', async () => {
      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        class_name: 'Updated 7A'
      };

      const result = await updateClass(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.class_name).toEqual('Updated 7A');
      expect(result.grade_level).toEqual(7); // Should remain unchanged
      expect(result.rombel).toEqual('A'); // Should remain unchanged
    });

    it('should validate academic year when updating', async () => {
      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        academic_year_id: 999
      };

      await expect(updateClass(updateInput)).rejects.toThrow(/Academic year with ID 999 not found/i);
    });

    it('should update academic year when valid', async () => {
      const created = await createClass(testClassInput);

      // Create another academic year
      const academicYear2 = await db.insert(academicYearsTable)
        .values({
          ...testAcademicYear,
          year: '2025/2026'
        })
        .returning()
        .execute();

      const updateInput: UpdateClassInput = {
        id: created.id,
        academic_year_id: academicYear2[0].id
      };

      const result = await updateClass(updateInput);

      expect(result.academic_year_id).toEqual(academicYear2[0].id);
    });
  });

  describe('deleteClass', () => {
    it('should throw error for non-existent class', async () => {
      await expect(deleteClass(999)).rejects.toThrow(/Class with ID 999 not found/i);
    });

    it('should delete class successfully', async () => {
      const created = await createClass(testClassInput);

      const result = await deleteClass(created.id);
      expect(result).toBe(true);

      // Verify class is deleted
      const deletedClass = await getClassById(created.id);
      expect(deletedClass).toBeNull();
    });

    it('should remove class from database', async () => {
      const created = await createClass(testClassInput);

      await deleteClass(created.id);

      // Verify in database
      const classes = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, created.id))
        .execute();

      expect(classes).toHaveLength(0);
    });
  });
});