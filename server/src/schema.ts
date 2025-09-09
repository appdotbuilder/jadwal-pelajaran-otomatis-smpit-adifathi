import { z } from 'zod';

// School schema
export const schoolSchema = z.object({
  id: z.number(),
  name: z.string(),
  npsn: z.string(),
  address: z.string(),
  principal_name: z.string(),
  principal_nip: z.string(),
  logo_url: z.string().nullable(),
  letterhead_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type School = z.infer<typeof schoolSchema>;

export const createSchoolInputSchema = z.object({
  name: z.string(),
  npsn: z.string(),
  address: z.string(),
  principal_name: z.string(),
  principal_nip: z.string(),
  logo_url: z.string().nullable(),
  letterhead_url: z.string().nullable()
});

export type CreateSchoolInput = z.infer<typeof createSchoolInputSchema>;

// Teacher schema
export const teacherSchema = z.object({
  id: z.number(),
  name: z.string(),
  nip_nuptk: z.string(),
  tmt: z.coerce.date(),
  education: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Teacher = z.infer<typeof teacherSchema>;

export const createTeacherInputSchema = z.object({
  name: z.string(),
  nip_nuptk: z.string(),
  tmt: z.coerce.date(),
  education: z.string()
});

export type CreateTeacherInput = z.infer<typeof createTeacherInputSchema>;

// Academic Year schema
export const academicYearSchema = z.object({
  id: z.number(),
  year: z.string(),
  semester: z.number().int().min(1).max(2),
  curriculum: z.string(),
  total_time_allocation: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AcademicYear = z.infer<typeof academicYearSchema>;

export const createAcademicYearInputSchema = z.object({
  year: z.string(),
  semester: z.number().int().min(1).max(2),
  curriculum: z.string(),
  total_time_allocation: z.number().int().positive(),
  is_active: z.boolean().optional()
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearInputSchema>;

// Class schema
export const classSchema = z.object({
  id: z.number(),
  grade_level: z.number().int().min(7).max(9),
  rombel: z.string(),
  class_name: z.string(),
  academic_year_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Class = z.infer<typeof classSchema>;

export const createClassInputSchema = z.object({
  grade_level: z.number().int().min(7).max(9),
  rombel: z.string(),
  class_name: z.string(),
  academic_year_id: z.number()
});

export type CreateClassInput = z.infer<typeof createClassInputSchema>;

// Subject schema
export const subjectSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  time_allocation: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Subject = z.infer<typeof subjectSchema>;

export const createSubjectInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  time_allocation: z.number().int().positive()
});

export type CreateSubjectInput = z.infer<typeof createSubjectInputSchema>;

// Additional Task schema
export const additionalTaskSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  jp_equivalent: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AdditionalTask = z.infer<typeof additionalTaskSchema>;

export const createAdditionalTaskInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  jp_equivalent: z.number().positive()
});

export type CreateAdditionalTaskInput = z.infer<typeof createAdditionalTaskInputSchema>;

// Schedule Template schema
export const scheduleTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ScheduleTemplate = z.infer<typeof scheduleTemplateSchema>;

export const createScheduleTemplateInputSchema = z.object({
  name: z.string(),
  description: z.string()
});

export type CreateScheduleTemplateInput = z.infer<typeof createScheduleTemplateInputSchema>;

// Slot types enum
export const slotTypeEnum = z.enum([
  'belajar',
  'sholat_dhuha',
  'istirahat',
  'shalat_dzuhur_berjamaah',
  'halaqoh_quran',
  'program_pembiasaan',
  'upacara'
]);

export type SlotType = z.infer<typeof slotTypeEnum>;

// Time Slot schema
export const timeSlotSchema = z.object({
  id: z.number(),
  template_id: z.number(),
  day_of_week: z.number().int().min(1).max(5), // Monday = 1, Friday = 5
  jp_number: z.number().int().positive(),
  start_time: z.string(), // HH:mm format
  end_time: z.string(), // HH:mm format
  duration: z.number().int().positive(), // in minutes
  slot_type: slotTypeEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

export const createTimeSlotInputSchema = z.object({
  template_id: z.number(),
  day_of_week: z.number().int().min(1).max(5),
  jp_number: z.number().int().positive(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format validation
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().int().positive(),
  slot_type: slotTypeEnum
});

export type CreateTimeSlotInput = z.infer<typeof createTimeSlotInputSchema>;

// JTM Assignment schema
export const jtmAssignmentSchema = z.object({
  id: z.number(),
  academic_year_id: z.number(),
  teacher_id: z.number(),
  subject_id: z.number(),
  class_id: z.number(),
  allocated_hours: z.number().int().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type JtmAssignment = z.infer<typeof jtmAssignmentSchema>;

export const createJtmAssignmentInputSchema = z.object({
  academic_year_id: z.number(),
  teacher_id: z.number(),
  subject_id: z.number(),
  class_id: z.number(),
  allocated_hours: z.number().int().positive()
});

export type CreateJtmAssignmentInput = z.infer<typeof createJtmAssignmentInputSchema>;

// Additional Task Assignment schema
export const taskAssignmentSchema = z.object({
  id: z.number(),
  academic_year_id: z.number(),
  teacher_id: z.number(),
  task_id: z.number(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;

export const createTaskAssignmentInputSchema = z.object({
  academic_year_id: z.number(),
  teacher_id: z.number(),
  task_id: z.number(),
  description: z.string().nullable().optional()
});

export type CreateTaskAssignmentInput = z.infer<typeof createTaskAssignmentInputSchema>;

// Schedule schema
export const scheduleSchema = z.object({
  id: z.number(),
  academic_year_id: z.number(),
  class_id: z.number(),
  template_id: z.number(),
  day_of_week: z.number().int().min(1).max(5),
  jp_number: z.number().int().positive(),
  subject_id: z.number().nullable(),
  teacher_id: z.number().nullable(),
  is_manual: z.boolean(),
  is_cached: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Schedule = z.infer<typeof scheduleSchema>;

export const createScheduleInputSchema = z.object({
  academic_year_id: z.number(),
  class_id: z.number(),
  template_id: z.number(),
  day_of_week: z.number().int().min(1).max(5),
  jp_number: z.number().int().positive(),
  subject_id: z.number().nullable().optional(),
  teacher_id: z.number().nullable().optional(),
  is_manual: z.boolean(),
  is_cached: z.boolean().optional()
});

export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;

// SK Document Template schema
export const skDocumentTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  template_content: z.string(), // HTML/Text content with placeholders
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SkDocumentTemplate = z.infer<typeof skDocumentTemplateSchema>;

export const createSkDocumentTemplateInputSchema = z.object({
  name: z.string(),
  template_content: z.string()
});

export type CreateSkDocumentTemplateInput = z.infer<typeof createSkDocumentTemplateInputSchema>;

// SK Document schema
export const skDocumentSchema = z.object({
  id: z.number(),
  template_id: z.number(),
  academic_year_id: z.number(),
  document_number: z.string(),
  creation_date: z.coerce.date(),
  generated_content: z.string(), // Final generated content
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SkDocument = z.infer<typeof skDocumentSchema>;

export const createSkDocumentInputSchema = z.object({
  template_id: z.number(),
  academic_year_id: z.number(),
  document_number: z.string(),
  creation_date: z.coerce.date()
});

export type CreateSkDocumentInput = z.infer<typeof createSkDocumentInputSchema>;

// Update schemas for common operations
export const updateSchoolInputSchema = createSchoolInputSchema.partial().extend({
  id: z.number()
});

export const updateTeacherInputSchema = createTeacherInputSchema.partial().extend({
  id: z.number()
});

export const updateAcademicYearInputSchema = createAcademicYearInputSchema.partial().extend({
  id: z.number()
});

export const updateClassInputSchema = createClassInputSchema.partial().extend({
  id: z.number()
});

export const updateSubjectInputSchema = createSubjectInputSchema.partial().extend({
  id: z.number()
});

export const updateScheduleInputSchema = createScheduleInputSchema.partial().extend({
  id: z.number()
});

export type UpdateSchoolInput = z.infer<typeof updateSchoolInputSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherInputSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearInputSchema>;
export type UpdateClassInput = z.infer<typeof updateClassInputSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectInputSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleInputSchema>;

// Teacher workload status enum
export const workloadStatusEnum = z.enum(['layak', 'lebih', 'kurang']);
export type WorkloadStatus = z.infer<typeof workloadStatusEnum>;

// Teacher workload summary
export const teacherWorkloadSchema = z.object({
  teacher_id: z.number(),
  teacher_name: z.string(),
  total_jtm_hours: z.number(),
  total_task_equivalent: z.number(),
  total_workload: z.number(),
  status: workloadStatusEnum,
  details: z.array(z.object({
    type: z.enum(['jtm', 'task']),
    subject_name: z.string().optional(),
    class_name: z.string().optional(),
    task_name: z.string().optional(),
    hours: z.number()
  }))
});

export type TeacherWorkload = z.infer<typeof teacherWorkloadSchema>;