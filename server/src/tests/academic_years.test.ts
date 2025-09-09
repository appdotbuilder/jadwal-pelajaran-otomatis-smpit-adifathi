import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { academicYearsTable } from '../db/schema';
import { type CreateAcademicYearInput } from '../schema';
import { 
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  getActiveAcademicYear,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear
} from '../handlers/academic_years';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateAcademicYearInput = {
  year: '2024/2025',
  semester: 1,
  curriculum: 'Kurikulum Merdeka',
  total_time_allocation: 40,
  is_active: false
};

const testInputWithActive: CreateAcademicYearInput = {
  year: '2023/2024',
  semester: 2,
  curriculum: 'K13',
  total_time_allocation: 38,
  is_active: true
};

describe('Academic Year Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createAcademicYear', () => {
    it('should create an academic year', async () => {
      const result = await createAcademicYear(testInput);

      expect(result.year).toEqual('2024/2025');
      expect(result.semester).toEqual(1);
      expect(result.curriculum).toEqual('Kurikulum Merdeka');
      expect(result.total_time_allocation).toEqual(40);
      expect(result.is_active).toEqual(false);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create active academic year when specified', async () => {
      const result = await createAcademicYear(testInputWithActive);

      expect(result.is_active).toEqual(true);
      expect(result.year).toEqual('2023/2024');
      expect(result.semester).toEqual(2);
    });

    it('should save academic year to database', async () => {
      const result = await createAcademicYear(testInput);

      const academicYears = await db.select()
        .from(academicYearsTable)
        .where(eq(academicYearsTable.id, result.id))
        .execute();

      expect(academicYears).toHaveLength(1);
      expect(academicYears[0].year).toEqual('2024/2025');
      expect(academicYears[0].curriculum).toEqual('Kurikulum Merdeka');
      expect(academicYears[0].total_time_allocation).toEqual(40);
    });

    it('should default is_active to false when not specified', async () => {
      const inputWithoutActive = { ...testInput };
      delete inputWithoutActive.is_active;
      
      const result = await createAcademicYear(inputWithoutActive);

      expect(result.is_active).toEqual(false);
    });
  });

  describe('getAcademicYears', () => {
    it('should return empty array when no academic years exist', async () => {
      const result = await getAcademicYears();

      expect(result).toHaveLength(0);
    });

    it('should return all academic years', async () => {
      await createAcademicYear(testInput);
      await createAcademicYear(testInputWithActive);

      const result = await getAcademicYears();

      expect(result).toHaveLength(2);
      expect(result[0].year).toBeDefined();
      expect(result[1].year).toBeDefined();
    });

    it('should order academic years by year and semester', async () => {
      // Create in reverse order
      await createAcademicYear(testInput); // 2024/2025 semester 1
      await createAcademicYear(testInputWithActive); // 2023/2024 semester 2

      const result = await getAcademicYears();

      expect(result).toHaveLength(2);
      // Should be ordered: 2023/2024 first, then 2024/2025
      expect(result[0].year).toEqual('2023/2024');
      expect(result[1].year).toEqual('2024/2025');
    });
  });

  describe('getAcademicYearById', () => {
    it('should return null for non-existent ID', async () => {
      const result = await getAcademicYearById(999);

      expect(result).toBeNull();
    });

    it('should return academic year by ID', async () => {
      const created = await createAcademicYear(testInput);

      const result = await getAcademicYearById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.year).toEqual('2024/2025');
      expect(result!.curriculum).toEqual('Kurikulum Merdeka');
    });
  });

  describe('getActiveAcademicYear', () => {
    it('should return null when no active academic year exists', async () => {
      await createAcademicYear(testInput); // is_active: false

      const result = await getActiveAcademicYear();

      expect(result).toBeNull();
    });

    it('should return active academic year', async () => {
      await createAcademicYear(testInput);
      const active = await createAcademicYear(testInputWithActive);

      const result = await getActiveAcademicYear();

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(active.id);
      expect(result!.is_active).toEqual(true);
      expect(result!.year).toEqual('2023/2024');
    });
  });

  describe('updateAcademicYear', () => {
    it('should update academic year fields', async () => {
      const created = await createAcademicYear(testInput);

      const result = await updateAcademicYear({
        id: created.id,
        year: '2025/2026',
        curriculum: 'Updated Curriculum',
        total_time_allocation: 42
      });

      expect(result.id).toEqual(created.id);
      expect(result.year).toEqual('2025/2026');
      expect(result.curriculum).toEqual('Updated Curriculum');
      expect(result.total_time_allocation).toEqual(42);
      expect(result.semester).toEqual(1); // Should retain original value
    });

    it('should update database record', async () => {
      const created = await createAcademicYear(testInput);

      await updateAcademicYear({
        id: created.id,
        year: '2025/2026'
      });

      const updated = await db.select()
        .from(academicYearsTable)
        .where(eq(academicYearsTable.id, created.id))
        .execute();

      expect(updated[0].year).toEqual('2025/2026');
      expect(updated[0].updated_at > created.updated_at).toBe(true);
    });

    it('should throw error for non-existent ID', async () => {
      await expect(updateAcademicYear({
        id: 999,
        year: '2025/2026'
      })).rejects.toThrow(/not found/i);
    });
  });

  describe('setActiveAcademicYear', () => {
    it('should set academic year as active and deactivate others', async () => {
      const first = await createAcademicYear(testInputWithActive); // is_active: true
      const second = await createAcademicYear(testInput); // is_active: false

      const result = await setActiveAcademicYear(second.id);

      expect(result.id).toEqual(second.id);
      expect(result.is_active).toEqual(true);

      // Verify first academic year is now inactive
      const firstUpdated = await getAcademicYearById(first.id);
      expect(firstUpdated!.is_active).toEqual(false);

      // Verify only one active academic year exists
      const activeYears = await db.select()
        .from(academicYearsTable)
        .where(eq(academicYearsTable.is_active, true))
        .execute();

      expect(activeYears).toHaveLength(1);
      expect(activeYears[0].id).toEqual(second.id);
    });

    it('should throw error for non-existent ID', async () => {
      await expect(setActiveAcademicYear(999)).rejects.toThrow(/not found/i);
    });

    it('should handle multiple academic years correctly', async () => {
      const year1 = await createAcademicYear({ ...testInput, year: '2022/2023' });
      const year2 = await createAcademicYear({ ...testInputWithActive, year: '2023/2024' });
      const year3 = await createAcademicYear({ ...testInput, year: '2024/2025' });

      await setActiveAcademicYear(year3.id);

      const allYears = await getAcademicYears();
      const activeCount = allYears.filter(y => y.is_active).length;

      expect(activeCount).toEqual(1);
      expect(allYears.find(y => y.id === year3.id)!.is_active).toEqual(true);
      expect(allYears.find(y => y.id === year1.id)!.is_active).toEqual(false);
      expect(allYears.find(y => y.id === year2.id)!.is_active).toEqual(false);
    });
  });

  describe('deleteAcademicYear', () => {
    it('should return false for non-existent ID', async () => {
      const result = await deleteAcademicYear(999);

      expect(result).toEqual(false);
    });

    it('should delete academic year and return true', async () => {
      const created = await createAcademicYear(testInput);

      const result = await deleteAcademicYear(created.id);

      expect(result).toEqual(true);

      // Verify academic year is deleted
      const deleted = await getAcademicYearById(created.id);
      expect(deleted).toBeNull();
    });

    it('should remove academic year from database', async () => {
      const created = await createAcademicYear(testInput);

      await deleteAcademicYear(created.id);

      const academicYears = await db.select()
        .from(academicYearsTable)
        .where(eq(academicYearsTable.id, created.id))
        .execute();

      expect(academicYears).toHaveLength(0);
    });
  });
});