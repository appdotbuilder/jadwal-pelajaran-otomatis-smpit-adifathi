import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean,
  pgEnum,
  numeric
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const slotTypeEnum = pgEnum('slot_type', [
  'belajar',
  'sholat_dhuha', 
  'istirahat',
  'shalat_dzuhur_berjamaah',
  'halaqoh_quran',
  'program_pembiasaan',
  'upacara'
]);

export const workloadStatusEnum = pgEnum('workload_status', [
  'layak',
  'lebih', 
  'kurang'
]);

// Schools table
export const schoolsTable = pgTable('schools', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  npsn: text('npsn').notNull(),
  address: text('address').notNull(),
  principal_name: text('principal_name').notNull(),
  principal_nip: text('principal_nip').notNull(),
  logo_url: text('logo_url'),
  letterhead_url: text('letterhead_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Teachers table
export const teachersTable = pgTable('teachers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  nip_nuptk: text('nip_nuptk').notNull(),
  tmt: timestamp('tmt').notNull(),
  education: text('education').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Academic Years table
export const academicYearsTable = pgTable('academic_years', {
  id: serial('id').primaryKey(),
  year: text('year').notNull(), // e.g., "2024/2025"
  semester: integer('semester').notNull(), // 1 or 2
  curriculum: text('curriculum').notNull(),
  total_time_allocation: integer('total_time_allocation').notNull(),
  is_active: boolean('is_active').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Classes table
export const classesTable = pgTable('classes', {
  id: serial('id').primaryKey(),
  grade_level: integer('grade_level').notNull(), // 7, 8, or 9
  rombel: text('rombel').notNull(), // A, B, C, etc.
  class_name: text('class_name').notNull(), // Full class name like "7A", "8B"
  academic_year_id: integer('academic_year_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Subjects table
export const subjectsTable = pgTable('subjects', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  time_allocation: integer('time_allocation').notNull(), // Base time allocation
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Additional Tasks table
export const additionalTasksTable = pgTable('additional_tasks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  jp_equivalent: numeric('jp_equivalent', { precision: 4, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Schedule Templates table
export const scheduleTemplatesTable = pgTable('schedule_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Time Slots table
export const timeSlotsTable = pgTable('time_slots', {
  id: serial('id').primaryKey(),
  template_id: integer('template_id').notNull(),
  day_of_week: integer('day_of_week').notNull(), // 1=Monday, 5=Friday
  jp_number: integer('jp_number').notNull(),
  start_time: text('start_time').notNull(), // HH:mm format
  end_time: text('end_time').notNull(), // HH:mm format
  duration: integer('duration').notNull(), // in minutes
  slot_type: slotTypeEnum('slot_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// JTM Assignments table
export const jtmAssignmentsTable = pgTable('jtm_assignments', {
  id: serial('id').primaryKey(),
  academic_year_id: integer('academic_year_id').notNull(),
  teacher_id: integer('teacher_id').notNull(),
  subject_id: integer('subject_id').notNull(),
  class_id: integer('class_id').notNull(),
  allocated_hours: integer('allocated_hours').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Task Assignments table
export const taskAssignmentsTable = pgTable('task_assignments', {
  id: serial('id').primaryKey(),
  academic_year_id: integer('academic_year_id').notNull(),
  teacher_id: integer('teacher_id').notNull(),
  task_id: integer('task_id').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Schedules table
export const schedulesTable = pgTable('schedules', {
  id: serial('id').primaryKey(),
  academic_year_id: integer('academic_year_id').notNull(),
  class_id: integer('class_id').notNull(),
  template_id: integer('template_id').notNull(),
  day_of_week: integer('day_of_week').notNull(),
  jp_number: integer('jp_number').notNull(),
  subject_id: integer('subject_id'),
  teacher_id: integer('teacher_id'),
  is_manual: boolean('is_manual').default(true).notNull(),
  is_cached: boolean('is_cached').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// SK Document Templates table
export const skDocumentTemplatesTable = pgTable('sk_document_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  template_content: text('template_content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// SK Documents table
export const skDocumentsTable = pgTable('sk_documents', {
  id: serial('id').primaryKey(),
  template_id: integer('template_id').notNull(),
  academic_year_id: integer('academic_year_id').notNull(),
  document_number: text('document_number').notNull(),
  creation_date: timestamp('creation_date').notNull(),
  generated_content: text('generated_content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const schoolsRelations = relations(schoolsTable, ({ many }) => ({
  academicYears: many(academicYearsTable)
}));

export const teachersRelations = relations(teachersTable, ({ many }) => ({
  jtmAssignments: many(jtmAssignmentsTable),
  taskAssignments: many(taskAssignmentsTable),
  schedules: many(schedulesTable)
}));

export const academicYearsRelations = relations(academicYearsTable, ({ many }) => ({
  classes: many(classesTable),
  jtmAssignments: many(jtmAssignmentsTable),
  taskAssignments: many(taskAssignmentsTable),
  schedules: many(schedulesTable),
  skDocuments: many(skDocumentsTable)
}));

export const classesRelations = relations(classesTable, ({ one, many }) => ({
  academicYear: one(academicYearsTable, {
    fields: [classesTable.academic_year_id],
    references: [academicYearsTable.id]
  }),
  jtmAssignments: many(jtmAssignmentsTable),
  schedules: many(schedulesTable)
}));

export const subjectsRelations = relations(subjectsTable, ({ many }) => ({
  jtmAssignments: many(jtmAssignmentsTable),
  schedules: many(schedulesTable)
}));

export const additionalTasksRelations = relations(additionalTasksTable, ({ many }) => ({
  taskAssignments: many(taskAssignmentsTable)
}));

export const scheduleTemplatesRelations = relations(scheduleTemplatesTable, ({ many }) => ({
  timeSlots: many(timeSlotsTable),
  schedules: many(schedulesTable)
}));

export const timeSlotsRelations = relations(timeSlotsTable, ({ one }) => ({
  template: one(scheduleTemplatesTable, {
    fields: [timeSlotsTable.template_id],
    references: [scheduleTemplatesTable.id]
  })
}));

export const jtmAssignmentsRelations = relations(jtmAssignmentsTable, ({ one }) => ({
  academicYear: one(academicYearsTable, {
    fields: [jtmAssignmentsTable.academic_year_id],
    references: [academicYearsTable.id]
  }),
  teacher: one(teachersTable, {
    fields: [jtmAssignmentsTable.teacher_id],
    references: [teachersTable.id]
  }),
  subject: one(subjectsTable, {
    fields: [jtmAssignmentsTable.subject_id],
    references: [subjectsTable.id]
  }),
  class: one(classesTable, {
    fields: [jtmAssignmentsTable.class_id],
    references: [classesTable.id]
  })
}));

export const taskAssignmentsRelations = relations(taskAssignmentsTable, ({ one }) => ({
  academicYear: one(academicYearsTable, {
    fields: [taskAssignmentsTable.academic_year_id],
    references: [academicYearsTable.id]
  }),
  teacher: one(teachersTable, {
    fields: [taskAssignmentsTable.teacher_id],
    references: [teachersTable.id]
  }),
  task: one(additionalTasksTable, {
    fields: [taskAssignmentsTable.task_id],
    references: [additionalTasksTable.id]
  })
}));

export const schedulesRelations = relations(schedulesTable, ({ one }) => ({
  academicYear: one(academicYearsTable, {
    fields: [schedulesTable.academic_year_id],
    references: [academicYearsTable.id]
  }),
  class: one(classesTable, {
    fields: [schedulesTable.class_id],
    references: [classesTable.id]
  }),
  template: one(scheduleTemplatesTable, {
    fields: [schedulesTable.template_id],
    references: [scheduleTemplatesTable.id]
  }),
  subject: one(subjectsTable, {
    fields: [schedulesTable.subject_id],
    references: [subjectsTable.id]
  }),
  teacher: one(teachersTable, {
    fields: [schedulesTable.teacher_id],
    references: [teachersTable.id]
  })
}));

export const skDocumentTemplatesRelations = relations(skDocumentTemplatesTable, ({ many }) => ({
  skDocuments: many(skDocumentsTable)
}));

export const skDocumentsRelations = relations(skDocumentsTable, ({ one }) => ({
  template: one(skDocumentTemplatesTable, {
    fields: [skDocumentsTable.template_id],
    references: [skDocumentTemplatesTable.id]
  }),
  academicYear: one(academicYearsTable, {
    fields: [skDocumentsTable.academic_year_id],
    references: [academicYearsTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  schools: schoolsTable,
  teachers: teachersTable,
  academicYears: academicYearsTable,
  classes: classesTable,
  subjects: subjectsTable,
  additionalTasks: additionalTasksTable,
  scheduleTemplates: scheduleTemplatesTable,
  timeSlots: timeSlotsTable,
  jtmAssignments: jtmAssignmentsTable,
  taskAssignments: taskAssignmentsTable,
  schedules: schedulesTable,
  skDocumentTemplates: skDocumentTemplatesTable,
  skDocuments: skDocumentsTable
};