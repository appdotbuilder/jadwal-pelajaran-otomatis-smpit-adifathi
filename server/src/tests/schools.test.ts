import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { schoolsTable } from '../db/schema';
import { type CreateSchoolInput, type UpdateSchoolInput } from '../schema';
import { 
  createSchool, 
  getSchools, 
  getSchoolById, 
  updateSchool, 
  deleteSchool 
} from '../handlers/schools';
import { eq } from 'drizzle-orm';

// Test input data
const testSchoolInput: CreateSchoolInput = {
  name: 'SMP Negeri 1 Test',
  npsn: '12345678',
  address: 'Jl. Test No. 123, Jakarta',
  principal_name: 'Dr. John Doe',
  principal_nip: '196501011990031001',
  logo_url: 'https://example.com/logo.png',
  letterhead_url: 'https://example.com/letterhead.png'
};

const minimalSchoolInput: CreateSchoolInput = {
  name: 'SMP Minimal Test',
  npsn: '87654321',
  address: 'Jl. Minimal No. 456',
  principal_name: 'Jane Smith',
  principal_nip: '197502021991032002',
  logo_url: null,
  letterhead_url: null
};

describe('Schools Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createSchool', () => {
    it('should create a school with all fields', async () => {
      const result = await createSchool(testSchoolInput);

      expect(result.name).toEqual('SMP Negeri 1 Test');
      expect(result.npsn).toEqual('12345678');
      expect(result.address).toEqual('Jl. Test No. 123, Jakarta');
      expect(result.principal_name).toEqual('Dr. John Doe');
      expect(result.principal_nip).toEqual('196501011990031001');
      expect(result.logo_url).toEqual('https://example.com/logo.png');
      expect(result.letterhead_url).toEqual('https://example.com/letterhead.png');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a school with nullable fields as null', async () => {
      const result = await createSchool(minimalSchoolInput);

      expect(result.name).toEqual('SMP Minimal Test');
      expect(result.logo_url).toBeNull();
      expect(result.letterhead_url).toBeNull();
      expect(result.id).toBeDefined();
    });

    it('should save school to database', async () => {
      const result = await createSchool(testSchoolInput);

      const schools = await db.select()
        .from(schoolsTable)
        .where(eq(schoolsTable.id, result.id))
        .execute();

      expect(schools).toHaveLength(1);
      expect(schools[0].name).toEqual('SMP Negeri 1 Test');
      expect(schools[0].npsn).toEqual('12345678');
      expect(schools[0].principal_name).toEqual('Dr. John Doe');
    });
  });

  describe('getSchools', () => {
    it('should return empty array when no schools exist', async () => {
      const result = await getSchools();
      expect(result).toEqual([]);
    });

    it('should return all schools', async () => {
      await createSchool(testSchoolInput);
      await createSchool(minimalSchoolInput);

      const result = await getSchools();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('SMP Negeri 1 Test');
      expect(result[1].name).toEqual('SMP Minimal Test');
    });

    it('should return schools with proper date types', async () => {
      await createSchool(testSchoolInput);

      const result = await getSchools();

      expect(result[0].created_at).toBeInstanceOf(Date);
      expect(result[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getSchoolById', () => {
    it('should return null for non-existent school', async () => {
      const result = await getSchoolById(999);
      expect(result).toBeNull();
    });

    it('should return school by ID', async () => {
      const created = await createSchool(testSchoolInput);

      const result = await getSchoolById(created.id);

      expect(result).not.toBeNull();
      expect(result?.name).toEqual('SMP Negeri 1 Test');
      expect(result?.id).toEqual(created.id);
    });

    it('should return correct school when multiple exist', async () => {
      const school1 = await createSchool(testSchoolInput);
      const school2 = await createSchool(minimalSchoolInput);

      const result = await getSchoolById(school2.id);

      expect(result?.name).toEqual('SMP Minimal Test');
      expect(result?.id).toEqual(school2.id);
    });
  });

  describe('updateSchool', () => {
    it('should update all school fields', async () => {
      const created = await createSchool(testSchoolInput);

      const updateInput: UpdateSchoolInput = {
        id: created.id,
        name: 'Updated School Name',
        npsn: '99999999',
        address: 'Updated Address',
        principal_name: 'Updated Principal',
        principal_nip: 'UPDATED_NIP',
        logo_url: 'https://updated.com/logo.png',
        letterhead_url: 'https://updated.com/letterhead.png'
      };

      const result = await updateSchool(updateInput);

      expect(result.name).toEqual('Updated School Name');
      expect(result.npsn).toEqual('99999999');
      expect(result.address).toEqual('Updated Address');
      expect(result.principal_name).toEqual('Updated Principal');
      expect(result.principal_nip).toEqual('UPDATED_NIP');
      expect(result.logo_url).toEqual('https://updated.com/logo.png');
      expect(result.letterhead_url).toEqual('https://updated.com/letterhead.png');
      expect(result.id).toEqual(created.id);
    });

    it('should update only provided fields', async () => {
      const created = await createSchool(testSchoolInput);

      const updateInput: UpdateSchoolInput = {
        id: created.id,
        name: 'Partially Updated Name'
      };

      const result = await updateSchool(updateInput);

      expect(result.name).toEqual('Partially Updated Name');
      expect(result.npsn).toEqual(testSchoolInput.npsn); // Should remain unchanged
      expect(result.address).toEqual(testSchoolInput.address); // Should remain unchanged
    });

    it('should update nullable fields to null', async () => {
      const created = await createSchool(testSchoolInput);

      const updateInput: UpdateSchoolInput = {
        id: created.id,
        logo_url: null,
        letterhead_url: null
      };

      const result = await updateSchool(updateInput);

      expect(result.logo_url).toBeNull();
      expect(result.letterhead_url).toBeNull();
      expect(result.name).toEqual(testSchoolInput.name); // Should remain unchanged
    });

    it('should save updates to database', async () => {
      const created = await createSchool(testSchoolInput);

      await updateSchool({
        id: created.id,
        name: 'Database Updated Name'
      });

      const schools = await db.select()
        .from(schoolsTable)
        .where(eq(schoolsTable.id, created.id))
        .execute();

      expect(schools[0].name).toEqual('Database Updated Name');
    });

    it('should throw error for non-existent school', async () => {
      const updateInput: UpdateSchoolInput = {
        id: 999,
        name: 'Non-existent School'
      };

      await expect(updateSchool(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteSchool', () => {
    it('should delete existing school', async () => {
      const created = await createSchool(testSchoolInput);

      const result = await deleteSchool(created.id);

      expect(result).toBe(true);

      // Verify school was deleted from database
      const schools = await db.select()
        .from(schoolsTable)
        .where(eq(schoolsTable.id, created.id))
        .execute();

      expect(schools).toHaveLength(0);
    });

    it('should return false for non-existent school', async () => {
      const result = await deleteSchool(999);
      expect(result).toBe(false);
    });

    it('should not affect other schools when deleting one', async () => {
      const school1 = await createSchool(testSchoolInput);
      const school2 = await createSchool(minimalSchoolInput);

      await deleteSchool(school1.id);

      const remaining = await getSchools();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toEqual(school2.id);
    });
  });
});