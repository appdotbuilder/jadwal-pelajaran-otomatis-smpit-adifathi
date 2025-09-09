import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teachersTable } from '../db/schema';
import { type CreateTeacherInput, type UpdateTeacherInput } from '../schema';
import { 
  createTeacher, 
  getTeachers, 
  getTeacherById, 
  updateTeacher, 
  deleteTeacher 
} from '../handlers/teachers';
import { eq } from 'drizzle-orm';

// Test input data
const testTeacherInput: CreateTeacherInput = {
  name: 'Dr. Ahmad Nurcahya',
  nip_nuptk: '196801051994031003',
  tmt: new Date('2010-07-01'),
  education: 'S2 Pendidikan Matematika'
};

const testTeacherInput2: CreateTeacherInput = {
  name: 'Siti Nurjanah, S.Pd',
  nip_nuptk: '197503122001122002',
  tmt: new Date('2005-01-15'),
  education: 'S1 Pendidikan Bahasa Indonesia'
};

describe('createTeacher', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a teacher', async () => {
    const result = await createTeacher(testTeacherInput);

    // Basic field validation
    expect(result.name).toEqual('Dr. Ahmad Nurcahya');
    expect(result.nip_nuptk).toEqual('196801051994031003');
    expect(result.tmt).toEqual(testTeacherInput.tmt);
    expect(result.education).toEqual('S2 Pendidikan Matematika');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save teacher to database', async () => {
    const result = await createTeacher(testTeacherInput);

    // Query database directly to verify
    const teachers = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, result.id))
      .execute();

    expect(teachers).toHaveLength(1);
    expect(teachers[0].name).toEqual('Dr. Ahmad Nurcahya');
    expect(teachers[0].nip_nuptk).toEqual('196801051994031003');
    expect(teachers[0].tmt).toEqual(testTeacherInput.tmt);
    expect(teachers[0].education).toEqual('S2 Pendidikan Matematika');
    expect(teachers[0].created_at).toBeInstanceOf(Date);
    expect(teachers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple teachers with different data', async () => {
    // Create first teacher
    const teacher1 = await createTeacher(testTeacherInput);
    
    // Create second teacher with different data
    const teacher2 = await createTeacher(testTeacherInput2);

    expect(teacher1.id).not.toEqual(teacher2.id);
    expect(teacher1.name).toEqual('Dr. Ahmad Nurcahya');
    expect(teacher2.name).toEqual('Siti Nurjanah, S.Pd');
  });
});

describe('getTeachers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no teachers exist', async () => {
    const result = await getTeachers();
    expect(result).toEqual([]);
  });

  it('should return all teachers', async () => {
    // Create multiple teachers
    const teacher1 = await createTeacher(testTeacherInput);
    const teacher2 = await createTeacher(testTeacherInput2);

    const result = await getTeachers();

    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === teacher1.id)).toBeDefined();
    expect(result.find(t => t.id === teacher2.id)).toBeDefined();
    
    // Verify data integrity
    const foundTeacher1 = result.find(t => t.id === teacher1.id);
    expect(foundTeacher1?.name).toEqual('Dr. Ahmad Nurcahya');
    expect(foundTeacher1?.nip_nuptk).toEqual('196801051994031003');
    expect(foundTeacher1?.education).toEqual('S2 Pendidikan Matematika');
  });
});

describe('getTeacherById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent teacher', async () => {
    const result = await getTeacherById(999);
    expect(result).toBeNull();
  });

  it('should return teacher by ID', async () => {
    const createdTeacher = await createTeacher(testTeacherInput);
    
    const result = await getTeacherById(createdTeacher.id);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(createdTeacher.id);
    expect(result?.name).toEqual('Dr. Ahmad Nurcahya');
    expect(result?.nip_nuptk).toEqual('196801051994031003');
    expect(result?.tmt).toEqual(testTeacherInput.tmt);
    expect(result?.education).toEqual('S2 Pendidikan Matematika');
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });
});

describe('updateTeacher', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update teacher information', async () => {
    const createdTeacher = await createTeacher(testTeacherInput);
    
    const updateInput: UpdateTeacherInput = {
      id: createdTeacher.id,
      name: 'Prof. Ahmad Nurcahya, Ph.D',
      education: 'S3 Pendidikan Matematika'
    };

    const result = await updateTeacher(updateInput);

    expect(result.id).toEqual(createdTeacher.id);
    expect(result.name).toEqual('Prof. Ahmad Nurcahya, Ph.D');
    expect(result.nip_nuptk).toEqual('196801051994031003'); // Unchanged
    expect(result.tmt).toEqual(testTeacherInput.tmt); // Unchanged
    expect(result.education).toEqual('S3 Pendidikan Matematika');
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update teacher in database', async () => {
    const createdTeacher = await createTeacher(testTeacherInput);
    
    const updateInput: UpdateTeacherInput = {
      id: createdTeacher.id,
      name: 'Updated Teacher Name'
    };

    await updateTeacher(updateInput);

    // Verify in database
    const dbTeacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, createdTeacher.id))
      .execute();

    expect(dbTeacher).toHaveLength(1);
    expect(dbTeacher[0].name).toEqual('Updated Teacher Name');
    expect(dbTeacher[0].nip_nuptk).toEqual('196801051994031003'); // Unchanged
    expect(dbTeacher[0].education).toEqual('S2 Pendidikan Matematika'); // Unchanged
  });

  it('should throw error for non-existent teacher', async () => {
    const updateInput: UpdateTeacherInput = {
      id: 999,
      name: 'Non-existent Teacher'
    };

    expect(updateTeacher(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update only provided fields', async () => {
    const createdTeacher = await createTeacher(testTeacherInput);
    
    const updateInput: UpdateTeacherInput = {
      id: createdTeacher.id,
      education: 'S3 Pendidikan Matematika'
    };

    const result = await updateTeacher(updateInput);

    // Only education should change
    expect(result.name).toEqual('Dr. Ahmad Nurcahya'); // Unchanged
    expect(result.nip_nuptk).toEqual('196801051994031003'); // Unchanged
    expect(result.education).toEqual('S3 Pendidikan Matematika'); // Changed
  });
});

describe('deleteTeacher', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return false for non-existent teacher', async () => {
    const result = await deleteTeacher(999);
    expect(result).toBe(false);
  });

  it('should delete existing teacher', async () => {
    const createdTeacher = await createTeacher(testTeacherInput);
    
    const result = await deleteTeacher(createdTeacher.id);
    expect(result).toBe(true);

    // Verify teacher no longer exists
    const dbTeacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, createdTeacher.id))
      .execute();

    expect(dbTeacher).toHaveLength(0);
  });

  it('should not affect other teachers when deleting one', async () => {
    const teacher1 = await createTeacher(testTeacherInput);
    const teacher2 = await createTeacher(testTeacherInput2);

    const result = await deleteTeacher(teacher1.id);
    expect(result).toBe(true);

    // Teacher 2 should still exist
    const remainingTeacher = await getTeacherById(teacher2.id);
    expect(remainingTeacher).not.toBeNull();
    expect(remainingTeacher?.name).toEqual('Siti Nurjanah, S.Pd');

    // Teacher 1 should not exist
    const deletedTeacher = await getTeacherById(teacher1.id);
    expect(deletedTeacher).toBeNull();
  });
});