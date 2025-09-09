import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { additionalTasksTable } from '../db/schema';
import { type CreateAdditionalTaskInput } from '../schema';
import { createAdditionalTask } from '../handlers/additional_tasks';
import { eq } from 'drizzle-orm';

// Test input for basic additional task creation
const testInput: CreateAdditionalTaskInput = {
  name: 'Koordinator Ekstrakurikuler',
  description: 'Mengkoordinasikan seluruh kegiatan ekstrakurikuler di sekolah',
  jp_equivalent: 2.5
};

// Test input with decimal JP equivalent
const decimalInput: CreateAdditionalTaskInput = {
  name: 'Wali Kelas',
  description: 'Bertanggung jawab terhadap administrasi dan pembinaan kelas',
  jp_equivalent: 1.75
};

// Test input with minimal data
const minimalInput: CreateAdditionalTaskInput = {
  name: 'Piket Harian',
  description: 'Melaksanakan tugas piket harian sekolah',
  jp_equivalent: 0.25
};

describe('createAdditionalTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an additional task', async () => {
    const result = await createAdditionalTask(testInput);

    // Basic field validation
    expect(result.name).toEqual('Koordinator Ekstrakurikuler');
    expect(result.description).toEqual('Mengkoordinasikan seluruh kegiatan ekstrakurikuler di sekolah');
    expect(result.jp_equivalent).toEqual(2.5);
    expect(typeof result.jp_equivalent).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save additional task to database', async () => {
    const result = await createAdditionalTask(testInput);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(additionalTasksTable)
      .where(eq(additionalTasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toEqual('Koordinator Ekstrakurikuler');
    expect(tasks[0].description).toEqual(testInput.description);
    expect(parseFloat(tasks[0].jp_equivalent)).toEqual(2.5);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal JP equivalent values', async () => {
    const result = await createAdditionalTask(decimalInput);

    expect(result.jp_equivalent).toEqual(1.75);
    expect(typeof result.jp_equivalent).toEqual('number');

    // Verify in database
    const tasks = await db.select()
      .from(additionalTasksTable)
      .where(eq(additionalTasksTable.id, result.id))
      .execute();

    expect(parseFloat(tasks[0].jp_equivalent)).toEqual(1.75);
  });

  it('should handle minimal JP equivalent values', async () => {
    const result = await createAdditionalTask(minimalInput);

    expect(result.jp_equivalent).toEqual(0.25);
    expect(result.name).toEqual('Piket Harian');
    expect(result.description).toEqual('Melaksanakan tugas piket harian sekolah');
  });

  it('should create multiple tasks with different JP values', async () => {
    const task1 = await createAdditionalTask(testInput);
    const task2 = await createAdditionalTask(decimalInput);
    const task3 = await createAdditionalTask(minimalInput);

    // Verify different JP equivalent values
    expect(task1.jp_equivalent).toEqual(2.5);
    expect(task2.jp_equivalent).toEqual(1.75);
    expect(task3.jp_equivalent).toEqual(0.25);

    // Verify all tasks are saved
    const allTasks = await db.select()
      .from(additionalTasksTable)
      .execute();

    expect(allTasks).toHaveLength(3);
    
    // Verify JP equivalent values are stored correctly as numeric
    const jpValues = allTasks.map(task => parseFloat(task.jp_equivalent)).sort();
    expect(jpValues).toEqual([0.25, 1.75, 2.5]);
  });

  it('should handle long task names and descriptions', async () => {
    const longInput: CreateAdditionalTaskInput = {
      name: 'Koordinator Program Pengembangan Karakter dan Pembentukan Akhlak Mulia Siswa',
      description: 'Bertanggung jawab dalam merancang, melaksanakan, dan mengevaluasi program-program yang bertujuan untuk mengembangkan karakter siswa sesuai dengan nilai-nilai Pancasila dan ajaran Islam, termasuk mengkoordinasikan kegiatan-kegiatan pembiasaan, monitoring perkembangan karakter siswa, serta melakukan kolaborasi dengan wali kelas dan guru BK dalam pembinaan karakter siswa',
      jp_equivalent: 3.0
    };

    const result = await createAdditionalTask(longInput);

    expect(result.name).toEqual(longInput.name);
    expect(result.description).toEqual(longInput.description);
    expect(result.jp_equivalent).toEqual(3.0);
  });

  it('should preserve exact decimal precision', async () => {
    const precisionInput: CreateAdditionalTaskInput = {
      name: 'Test Precision',
      description: 'Testing decimal precision',
      jp_equivalent: 1.123456789
    };

    const result = await createAdditionalTask(precisionInput);
    
    // Check that the value is preserved with reasonable precision
    expect(result.jp_equivalent).toBeCloseTo(1.123456789, 2);
    
    // Verify in database
    const tasks = await db.select()
      .from(additionalTasksTable)
      .where(eq(additionalTasksTable.id, result.id))
      .execute();
    
    expect(parseFloat(tasks[0].jp_equivalent)).toBeCloseTo(1.123456789, 2);
  });
});