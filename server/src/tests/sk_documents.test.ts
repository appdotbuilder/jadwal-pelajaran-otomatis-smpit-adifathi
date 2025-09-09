import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    skDocumentTemplatesTable, 
    skDocumentsTable, 
    academicYearsTable, 
    teachersTable, 
    subjectsTable, 
    classesTable, 
    jtmAssignmentsTable, 
    taskAssignmentsTable, 
    additionalTasksTable 
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateSkDocumentTemplateInput, type CreateSkDocumentInput } from '../schema';
import { 
    createSkDocumentTemplate,
    getSkDocumentTemplates,
    getSkDocumentTemplateById,
    updateSkDocumentTemplate,
    deleteSkDocumentTemplate,
    generateSkDocument,
    getSkDocumentsByAcademicYear,
    getSkDocumentById,
    updateSkDocument,
    deleteSkDocument,
    previewSkDocument,
    exportSkDocumentToPdf
} from '../handlers/sk_documents';

// Test inputs
const testTemplateInput: CreateSkDocumentTemplateInput = {
    name: 'SK Pembagian Tugas Mengajar',
    template_content: `
        SURAT KEPUTUSAN KEPALA SEKOLAH
        Tahun Pelajaran {{academic_year}} Semester {{semester}}
        Kurikulum {{curriculum}}
        
        PEMBAGIAN TUGAS MENGAJAR:
        {{teacher_workload_summary}}
    `
};

describe('SK Document Templates', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should create SK document template', async () => {
        const result = await createSkDocumentTemplate(testTemplateInput);

        expect(result.name).toEqual('SK Pembagian Tugas Mengajar');
        expect(result.template_content).toContain('{{academic_year}}');
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
        expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save SK document template to database', async () => {
        const result = await createSkDocumentTemplate(testTemplateInput);

        const templates = await db.select()
            .from(skDocumentTemplatesTable)
            .where(eq(skDocumentTemplatesTable.id, result.id))
            .execute();

        expect(templates).toHaveLength(1);
        expect(templates[0].name).toEqual('SK Pembagian Tugas Mengajar');
        expect(templates[0].template_content).toContain('{{academic_year}}');
    });

    it('should get all SK document templates', async () => {
        await createSkDocumentTemplate(testTemplateInput);
        await createSkDocumentTemplate({
            name: 'Another Template',
            template_content: 'Different content'
        });

        const templates = await getSkDocumentTemplates();

        expect(templates).toHaveLength(2);
        expect(templates.map(t => t.name)).toContain('SK Pembagian Tugas Mengajar');
        expect(templates.map(t => t.name)).toContain('Another Template');
    });

    it('should get SK document template by ID', async () => {
        const created = await createSkDocumentTemplate(testTemplateInput);
        const template = await getSkDocumentTemplateById(created.id);

        expect(template).toBeDefined();
        expect(template!.id).toEqual(created.id);
        expect(template!.name).toEqual('SK Pembagian Tugas Mengajar');
    });

    it('should return null for non-existent template ID', async () => {
        const template = await getSkDocumentTemplateById(999);
        expect(template).toBeNull();
    });

    it('should update SK document template', async () => {
        const created = await createSkDocumentTemplate(testTemplateInput);
        
        const updated = await updateSkDocumentTemplate({
            id: created.id,
            name: 'Updated Template Name',
            template_content: 'Updated content with {{new_placeholder}}'
        });

        expect(updated.name).toEqual('Updated Template Name');
        expect(updated.template_content).toContain('{{new_placeholder}}');
        expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update only specified fields', async () => {
        const created = await createSkDocumentTemplate(testTemplateInput);
        
        const updated = await updateSkDocumentTemplate({
            id: created.id,
            name: 'Only Name Updated'
        });

        expect(updated.name).toEqual('Only Name Updated');
        expect(updated.template_content).toEqual(created.template_content);
    });

    it('should throw error when updating non-existent template', async () => {
        await expect(updateSkDocumentTemplate({
            id: 999,
            name: 'Non-existent'
        })).rejects.toThrow(/not found/i);
    });

    it('should delete SK document template', async () => {
        const created = await createSkDocumentTemplate(testTemplateInput);
        const deleted = await deleteSkDocumentTemplate(created.id);

        expect(deleted).toBe(true);

        const template = await getSkDocumentTemplateById(created.id);
        expect(template).toBeNull();
    });

    it('should return false when deleting non-existent template', async () => {
        const deleted = await deleteSkDocumentTemplate(999);
        expect(deleted).toBe(false);
    });
});

describe('SK Document Generation', () => {
    let templateId: number;
    let academicYearId: number;
    let teacherId: number;
    let subjectId: number;
    let classId: number;

    beforeEach(async () => {
        await createDB();

        // Create template
        const template = await createSkDocumentTemplate(testTemplateInput);
        templateId = template.id;

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
                name: 'John Doe',
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
        const classData = await db.insert(classesTable)
            .values({
                grade_level: 7,
                rombel: 'A',
                class_name: '7A',
                academic_year_id: academicYearId
            })
            .returning()
            .execute();
        classId = classData[0].id;

        // Create JTM assignment
        await db.insert(jtmAssignmentsTable)
            .values({
                academic_year_id: academicYearId,
                teacher_id: teacherId,
                subject_id: subjectId,
                class_id: classId,
                allocated_hours: 4
            })
            .execute();

        // Create additional task and assignment
        const task = await db.insert(additionalTasksTable)
            .values({
                name: 'Wali Kelas',
                description: 'Tugas sebagai wali kelas',
                jp_equivalent: '2.5'
            })
            .returning()
            .execute();

        await db.insert(taskAssignmentsTable)
            .values({
                academic_year_id: academicYearId,
                teacher_id: teacherId,
                task_id: task[0].id,
                description: 'Wali kelas 7A'
            })
            .execute();
    });

    afterEach(resetDB);

    it('should generate SK document from template', async () => {
        const documentInput: CreateSkDocumentInput = {
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/001/2024',
            creation_date: new Date()
        };

        const result = await generateSkDocument(documentInput);

        expect(result.template_id).toEqual(templateId);
        expect(result.academic_year_id).toEqual(academicYearId);
        expect(result.document_number).toEqual('SK/001/2024');
        expect(result.generated_content).toContain('2024/2025');
        expect(result.generated_content).toContain('Kurikulum Merdeka');
        expect(result.generated_content).toContain('John Doe');
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should replace placeholders with actual data', async () => {
        const documentInput: CreateSkDocumentInput = {
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/002/2024',
            creation_date: new Date()
        };

        const result = await generateSkDocument(documentInput);
        const content = result.generated_content;

        // Check that placeholders are replaced
        expect(content).toContain('2024/2025'); // academic_year
        expect(content).toContain('1'); // semester
        expect(content).toContain('Kurikulum Merdeka'); // curriculum
        expect(content).toContain('John Doe - Total: 6.5 JP'); // teacher workload summary

        // Ensure placeholders are not left unreplaced
        expect(content).not.toContain('{{academic_year}}');
        expect(content).not.toContain('{{semester}}');
        expect(content).not.toContain('{{curriculum}}');
    });

    it('should throw error when template not found', async () => {
        const documentInput: CreateSkDocumentInput = {
            template_id: 999,
            academic_year_id: academicYearId,
            document_number: 'SK/003/2024',
            creation_date: new Date()
        };

        await expect(generateSkDocument(documentInput)).rejects.toThrow(/Template not found/i);
    });

    it('should throw error when academic year not found', async () => {
        const documentInput: CreateSkDocumentInput = {
            template_id: templateId,
            academic_year_id: 999,
            document_number: 'SK/004/2024',
            creation_date: new Date()
        };

        await expect(generateSkDocument(documentInput)).rejects.toThrow(/Academic year not found/i);
    });

    it('should get SK documents by academic year', async () => {
        const document1 = await generateSkDocument({
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/001/2024',
            creation_date: new Date()
        });

        const document2 = await generateSkDocument({
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/002/2024',
            creation_date: new Date()
        });

        const documents = await getSkDocumentsByAcademicYear(academicYearId);

        expect(documents).toHaveLength(2);
        expect(documents.map(d => d.id)).toContain(document1.id);
        expect(documents.map(d => d.id)).toContain(document2.id);
    });

    it('should get SK document by ID', async () => {
        const created = await generateSkDocument({
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/005/2024',
            creation_date: new Date()
        });

        const document = await getSkDocumentById(created.id);

        expect(document).toBeDefined();
        expect(document!.id).toEqual(created.id);
        expect(document!.document_number).toEqual('SK/005/2024');
    });

    it('should return null for non-existent document ID', async () => {
        const document = await getSkDocumentById(999);
        expect(document).toBeNull();
    });

    it('should update SK document', async () => {
        const created = await generateSkDocument({
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/006/2024',
            creation_date: new Date()
        });

        const newDate = new Date('2024-12-01');
        const updated = await updateSkDocument({
            id: created.id,
            document_number: 'SK/006-UPDATED/2024',
            creation_date: newDate
        });

        expect(updated.document_number).toEqual('SK/006-UPDATED/2024');
        expect(updated.creation_date).toEqual(newDate);
        expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should throw error when updating non-existent document', async () => {
        await expect(updateSkDocument({
            id: 999,
            document_number: 'Non-existent'
        })).rejects.toThrow(/not found/i);
    });

    it('should delete SK document', async () => {
        const created = await generateSkDocument({
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/007/2024',
            creation_date: new Date()
        });

        const deleted = await deleteSkDocument(created.id);

        expect(deleted).toBe(true);

        const document = await getSkDocumentById(created.id);
        expect(document).toBeNull();
    });

    it('should return false when deleting non-existent document', async () => {
        const deleted = await deleteSkDocument(999);
        expect(deleted).toBe(false);
    });

    it('should preview SK document generation', async () => {
        const preview = await previewSkDocument(templateId, academicYearId);

        expect(preview.template_name).toEqual('SK Pembagian Tugas Mengajar');
        expect(preview.preview_content).toContain('2024/2025');
        expect(preview.preview_content).toContain('John Doe');
        expect(preview.placeholders_filled).toHaveLength(3);
        
        const placeholders = preview.placeholders_filled;
        expect(placeholders.find(p => p.placeholder === '{{academic_year}}')?.value).toEqual('2024/2025');
        expect(placeholders.find(p => p.placeholder === '{{semester}}')?.value).toEqual('1');
        expect(placeholders.find(p => p.placeholder === '{{curriculum}}')?.value).toEqual('Kurikulum Merdeka');
    });

    it('should throw error when previewing with non-existent template', async () => {
        await expect(previewSkDocument(999, academicYearId)).rejects.toThrow(/Template not found/i);
    });

    it('should export SK document to PDF', async () => {
        const created = await generateSkDocument({
            template_id: templateId,
            academic_year_id: academicYearId,
            document_number: 'SK/008/2024',
            creation_date: new Date()
        });

        const result = await exportSkDocumentToPdf(created.id);

        expect(result.success).toBe(true);
        expect(result.pdf_url).toEqual(`/exports/sk-document-${created.id}.pdf`);
        expect(result.error).toBeUndefined();
    });

    it('should return error when exporting non-existent document', async () => {
        const result = await exportSkDocumentToPdf(999);

        expect(result.success).toBe(false);
        expect(result.error).toEqual('Document not found');
        expect(result.pdf_url).toBeUndefined();
    });
});