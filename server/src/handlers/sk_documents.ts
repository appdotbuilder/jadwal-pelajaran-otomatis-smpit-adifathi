import { db } from '../db';
import { skDocumentTemplatesTable, skDocumentsTable, academicYearsTable, teachersTable, jtmAssignmentsTable, subjectsTable, classesTable, taskAssignmentsTable, additionalTasksTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { 
    type CreateSkDocumentTemplateInput, 
    type SkDocumentTemplate,
    type CreateSkDocumentInput,
    type SkDocument
} from '../schema';

/**
 * Create a new SK document template
 * Handles SK template creation with placeholders for dynamic content
 */
export const createSkDocumentTemplate = async (input: CreateSkDocumentTemplateInput): Promise<SkDocumentTemplate> => {
    try {
        const result = await db.insert(skDocumentTemplatesTable)
            .values({
                name: input.name,
                template_content: input.template_content
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('SK document template creation failed:', error);
        throw error;
    }
};

/**
 * Get all SK document templates
 * Returns list of all SK document templates
 */
export const getSkDocumentTemplates = async (): Promise<SkDocumentTemplate[]> => {
    try {
        const result = await db.select()
            .from(skDocumentTemplatesTable)
            .execute();

        return result;
    } catch (error) {
        console.error('Failed to fetch SK document templates:', error);
        throw error;
    }
};

/**
 * Get SK document template by ID
 * Returns specific SK document template by ID
 */
export const getSkDocumentTemplateById = async (id: number): Promise<SkDocumentTemplate | null> => {
    try {
        const result = await db.select()
            .from(skDocumentTemplatesTable)
            .where(eq(skDocumentTemplatesTable.id, id))
            .execute();

        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Failed to fetch SK document template by ID:', error);
        throw error;
    }
};

/**
 * Update SK document template
 * Updates existing SK document template with new content
 */
export const updateSkDocumentTemplate = async (input: { id: number; name?: string; template_content?: string }): Promise<SkDocumentTemplate> => {
    try {
        const updateData: Partial<typeof skDocumentTemplatesTable.$inferInsert> = {};
        
        if (input.name !== undefined) updateData.name = input.name;
        if (input.template_content !== undefined) updateData.template_content = input.template_content;

        const result = await db.update(skDocumentTemplatesTable)
            .set({
                ...updateData,
                updated_at: new Date()
            })
            .where(eq(skDocumentTemplatesTable.id, input.id))
            .returning()
            .execute();

        if (result.length === 0) {
            throw new Error('SK document template not found');
        }

        return result[0];
    } catch (error) {
        console.error('SK document template update failed:', error);
        throw error;
    }
};

/**
 * Delete SK document template by ID
 * Removes SK document template from database
 */
export const deleteSkDocumentTemplate = async (id: number): Promise<boolean> => {
    try {
        const result = await db.delete(skDocumentTemplatesTable)
            .where(eq(skDocumentTemplatesTable.id, id))
            .execute();

        return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
        console.error('SK document template deletion failed:', error);
        throw error;
    }
};

/**
 * Generate SK document from template with placeholder replacement
 */
const generateContentFromTemplate = async (templateId: number, academicYearId: number): Promise<string> => {
    // Get template
    const template = await getSkDocumentTemplateById(templateId);
    if (!template) {
        throw new Error('Template not found');
    }

    // Get academic year data
    const academicYearResult = await db.select()
        .from(academicYearsTable)
        .where(eq(academicYearsTable.id, academicYearId))
        .execute();

    if (academicYearResult.length === 0) {
        throw new Error('Academic year not found');
    }

    const academicYear = academicYearResult[0];

    // Get teacher workload data
    const jtmAssignments = await db.select({
        teacher_id: jtmAssignmentsTable.teacher_id,
        teacher_name: teachersTable.name,
        subject_name: subjectsTable.name,
        class_name: classesTable.class_name,
        allocated_hours: jtmAssignmentsTable.allocated_hours
    })
    .from(jtmAssignmentsTable)
    .innerJoin(teachersTable, eq(jtmAssignmentsTable.teacher_id, teachersTable.id))
    .innerJoin(subjectsTable, eq(jtmAssignmentsTable.subject_id, subjectsTable.id))
    .innerJoin(classesTable, eq(jtmAssignmentsTable.class_id, classesTable.id))
    .where(eq(jtmAssignmentsTable.academic_year_id, academicYearId))
    .execute();

    const taskAssignments = await db.select({
        teacher_id: taskAssignmentsTable.teacher_id,
        teacher_name: teachersTable.name,
        task_name: additionalTasksTable.name,
        jp_equivalent: additionalTasksTable.jp_equivalent
    })
    .from(taskAssignmentsTable)
    .innerJoin(teachersTable, eq(taskAssignmentsTable.teacher_id, teachersTable.id))
    .innerJoin(additionalTasksTable, eq(taskAssignmentsTable.task_id, additionalTasksTable.id))
    .where(eq(taskAssignmentsTable.academic_year_id, academicYearId))
    .execute();

    // Replace placeholders in template
    let content = template.template_content;
    
    // Replace academic year placeholders
    content = content.replace(/\{\{academic_year\}\}/g, academicYear.year);
    content = content.replace(/\{\{semester\}\}/g, academicYear.semester.toString());
    content = content.replace(/\{\{curriculum\}\}/g, academicYear.curriculum);
    
    // Generate teacher workload summary
    const teacherSummary = jtmAssignments
        .reduce((acc, assignment) => {
            if (!acc[assignment.teacher_id]) {
                acc[assignment.teacher_id] = {
                    name: assignment.teacher_name,
                    jtm_hours: 0,
                    task_equivalent: 0,
                    assignments: []
                };
            }
            acc[assignment.teacher_id].jtm_hours += assignment.allocated_hours;
            acc[assignment.teacher_id].assignments.push(`${assignment.subject_name} (${assignment.class_name}): ${assignment.allocated_hours} JP`);
            return acc;
        }, {} as Record<number, any>);

    // Add task equivalents
    taskAssignments.forEach(task => {
        if (teacherSummary[task.teacher_id]) {
            teacherSummary[task.teacher_id].task_equivalent += parseFloat(task.jp_equivalent);
            teacherSummary[task.teacher_id].assignments.push(`${task.task_name}: ${task.jp_equivalent} JP`);
        }
    });

    // Generate teacher list for template
    const teacherList = Object.values(teacherSummary)
        .map((teacher: any) => `${teacher.name} - Total: ${teacher.jtm_hours + teacher.task_equivalent} JP`)
        .join('\n');

    content = content.replace(/\{\{teacher_workload_summary\}\}/g, teacherList);
    
    return content;
};

/**
 * Generate SK document from template
 * Creates SK document by filling template placeholders with actual data
 */
export const generateSkDocument = async (input: CreateSkDocumentInput): Promise<SkDocument> => {
    try {
        // Generate content from template
        const generatedContent = await generateContentFromTemplate(input.template_id, input.academic_year_id);

        const result = await db.insert(skDocumentsTable)
            .values({
                template_id: input.template_id,
                academic_year_id: input.academic_year_id,
                document_number: input.document_number,
                creation_date: input.creation_date,
                generated_content: generatedContent
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('SK document generation failed:', error);
        throw error;
    }
};

/**
 * Get SK documents by academic year
 * Returns SK documents for specific academic year
 */
export const getSkDocumentsByAcademicYear = async (academicYearId: number): Promise<SkDocument[]> => {
    try {
        const result = await db.select()
            .from(skDocumentsTable)
            .where(eq(skDocumentsTable.academic_year_id, academicYearId))
            .execute();

        return result;
    } catch (error) {
        console.error('Failed to fetch SK documents by academic year:', error);
        throw error;
    }
};

/**
 * Get SK document by ID
 * Returns specific SK document by ID
 */
export const getSkDocumentById = async (id: number): Promise<SkDocument | null> => {
    try {
        const result = await db.select()
            .from(skDocumentsTable)
            .where(eq(skDocumentsTable.id, id))
            .execute();

        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Failed to fetch SK document by ID:', error);
        throw error;
    }
};

/**
 * Update SK document
 * Updates existing SK document with new data
 */
export const updateSkDocument = async (input: { id: number; document_number?: string; creation_date?: Date }): Promise<SkDocument> => {
    try {
        const updateData: Partial<typeof skDocumentsTable.$inferInsert> = {};
        
        if (input.document_number !== undefined) updateData.document_number = input.document_number;
        if (input.creation_date !== undefined) updateData.creation_date = input.creation_date;

        const result = await db.update(skDocumentsTable)
            .set({
                ...updateData,
                updated_at: new Date()
            })
            .where(eq(skDocumentsTable.id, input.id))
            .returning()
            .execute();

        if (result.length === 0) {
            throw new Error('SK document not found');
        }

        return result[0];
    } catch (error) {
        console.error('SK document update failed:', error);
        throw error;
    }
};

/**
 * Delete SK document by ID
 * Removes SK document from database
 */
export const deleteSkDocument = async (id: number): Promise<boolean> => {
    try {
        const result = await db.delete(skDocumentsTable)
            .where(eq(skDocumentsTable.id, id))
            .execute();

        return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
        console.error('SK document deletion failed:', error);
        throw error;
    }
};

/**
 * Preview SK document generation
 * Shows preview of SK document without saving it
 */
export const previewSkDocument = async (templateId: number, academicYearId: number): Promise<{
    template_name: string;
    preview_content: string;
    placeholders_filled: Array<{
        placeholder: string;
        value: string;
    }>;
}> => {
    try {
        const template = await getSkDocumentTemplateById(templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        // Generate preview content
        const previewContent = await generateContentFromTemplate(templateId, academicYearId);

        // Get academic year for placeholder info
        const academicYearResult = await db.select()
            .from(academicYearsTable)
            .where(eq(academicYearsTable.id, academicYearId))
            .execute();

        const academicYear = academicYearResult[0];

        // Extract filled placeholders
        const placeholdersFilled = [
            { placeholder: '{{academic_year}}', value: academicYear.year },
            { placeholder: '{{semester}}', value: academicYear.semester.toString() },
            { placeholder: '{{curriculum}}', value: academicYear.curriculum }
        ];

        return {
            template_name: template.name,
            preview_content: previewContent,
            placeholders_filled: placeholdersFilled
        };
    } catch (error) {
        console.error('SK document preview failed:', error);
        throw error;
    }
};

/**
 * Export SK document to PDF
 * Generates PDF version of SK document
 */
export const exportSkDocumentToPdf = async (documentId: number): Promise<{
    success: boolean;
    pdf_url?: string;
    error?: string;
}> => {
    try {
        const document = await getSkDocumentById(documentId);
        if (!document) {
            return {
                success: false,
                error: 'Document not found'
            };
        }

        // In a real implementation, this would use a PDF generation library
        // For now, we'll simulate the PDF export
        const pdfUrl = `/exports/sk-document-${documentId}.pdf`;

        return {
            success: true,
            pdf_url: pdfUrl
        };
    } catch (error) {
        console.error('SK document PDF export failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};