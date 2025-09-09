import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { type CreateSubjectInput } from '../schema';
import { createSubject } from '../handlers/subjects';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateSubjectInput = {
    code: 'MTK',
    name: 'Matematika',
    time_allocation: 4
};

describe('createSubject', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should create a subject', async () => {
        const result = await createSubject(testInput);

        // Basic field validation
        expect(result.code).toEqual('MTK');
        expect(result.name).toEqual('Matematika');
        expect(result.time_allocation).toEqual(4);
        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe('number');
        expect(result.created_at).toBeInstanceOf(Date);
        expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save subject to database', async () => {
        const result = await createSubject(testInput);

        // Query using proper drizzle syntax
        const subjects = await db.select()
            .from(subjectsTable)
            .where(eq(subjectsTable.id, result.id))
            .execute();

        expect(subjects).toHaveLength(1);
        expect(subjects[0].code).toEqual('MTK');
        expect(subjects[0].name).toEqual('Matematika');
        expect(subjects[0].time_allocation).toEqual(4);
        expect(subjects[0].created_at).toBeInstanceOf(Date);
        expect(subjects[0].updated_at).toBeInstanceOf(Date);
    });

    it('should create subject with different time allocations', async () => {
        const subjectInputs = [
            { code: 'IPA', name: 'Ilmu Pengetahuan Alam', time_allocation: 5 },
            { code: 'IPS', name: 'Ilmu Pengetahuan Sosial', time_allocation: 3 },
            { code: 'BHS', name: 'Bahasa Indonesia', time_allocation: 6 }
        ];

        for (const input of subjectInputs) {
            const result = await createSubject(input);
            expect(result.code).toEqual(input.code);
            expect(result.name).toEqual(input.name);
            expect(result.time_allocation).toEqual(input.time_allocation);
            expect(result.id).toBeDefined();
        }

        // Verify all subjects were saved
        const allSubjects = await db.select()
            .from(subjectsTable)
            .execute();

        expect(allSubjects).toHaveLength(3);
        expect(allSubjects.map(s => s.code).sort()).toEqual(['BHS', 'IPA', 'IPS']);
    });

    it('should create subject with minimum time allocation', async () => {
        const minInput: CreateSubjectInput = {
            code: 'MIN',
            name: 'Minimum Subject',
            time_allocation: 1
        };

        const result = await createSubject(minInput);

        expect(result.code).toEqual('MIN');
        expect(result.name).toEqual('Minimum Subject');
        expect(result.time_allocation).toEqual(1);
    });

    it('should create subject with maximum reasonable time allocation', async () => {
        const maxInput: CreateSubjectInput = {
            code: 'MAX',
            name: 'Maximum Subject',
            time_allocation: 8
        };

        const result = await createSubject(maxInput);

        expect(result.code).toEqual('MAX');
        expect(result.name).toEqual('Maximum Subject');
        expect(result.time_allocation).toEqual(8);
    });

    it('should create subjects with unique codes', async () => {
        const subject1: CreateSubjectInput = {
            code: 'UNIQUE1',
            name: 'First Unique Subject',
            time_allocation: 2
        };

        const subject2: CreateSubjectInput = {
            code: 'UNIQUE2',
            name: 'Second Unique Subject',
            time_allocation: 3
        };

        const result1 = await createSubject(subject1);
        const result2 = await createSubject(subject2);

        expect(result1.id).not.toEqual(result2.id);
        expect(result1.code).toEqual('UNIQUE1');
        expect(result2.code).toEqual('UNIQUE2');

        // Verify both are in database
        const subjects = await db.select()
            .from(subjectsTable)
            .execute();

        expect(subjects).toHaveLength(2);
        expect(subjects.some(s => s.code === 'UNIQUE1')).toBe(true);
        expect(subjects.some(s => s.code === 'UNIQUE2')).toBe(true);
    });

    it('should handle long subject names correctly', async () => {
        const longNameInput: CreateSubjectInput = {
            code: 'LONG',
            name: 'This is a very long subject name that should be handled correctly by the system',
            time_allocation: 4
        };

        const result = await createSubject(longNameInput);

        expect(result.code).toEqual('LONG');
        expect(result.name).toEqual(longNameInput.name);
        expect(result.name.length).toBeGreaterThan(50);
        
        // Verify it's saved in database
        const subjects = await db.select()
            .from(subjectsTable)
            .where(eq(subjectsTable.id, result.id))
            .execute();

        expect(subjects[0].name).toEqual(longNameInput.name);
    });
});