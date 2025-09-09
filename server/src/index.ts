import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  createSchoolInputSchema,
  updateSchoolInputSchema,
  createTeacherInputSchema,
  updateTeacherInputSchema,
  createAcademicYearInputSchema,
  updateAcademicYearInputSchema,
  createClassInputSchema,
  updateClassInputSchema,
  createSubjectInputSchema,
  updateSubjectInputSchema,
  createAdditionalTaskInputSchema,
  createScheduleTemplateInputSchema,
  createTimeSlotInputSchema,
  createJtmAssignmentInputSchema,
  createTaskAssignmentInputSchema,
  createScheduleInputSchema,
  updateScheduleInputSchema,
  createSkDocumentTemplateInputSchema,
  createSkDocumentInputSchema,
  workloadStatusEnum
} from './schema';

// Handler imports
import {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool,
  deleteSchool
} from './handlers/schools';

import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} from './handlers/teachers';

import {
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  getActiveAcademicYear,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear
} from './handlers/academic_years';

import {
  createClass,
  getClasses,
  getClassesByAcademicYear,
  getClassById,
  updateClass,
  deleteClass
} from './handlers/classes';

import {
  createSubject,
  getSubjects,
  getSubjectById,
  getSubjectByCode,
  updateSubject,
  deleteSubject
} from './handlers/subjects';

import {
  createAdditionalTask,
  getAdditionalTasks,
  getAdditionalTaskById,
  updateAdditionalTask,
  deleteAdditionalTask
} from './handlers/additional_tasks';

import {
  createScheduleTemplate,
  getScheduleTemplates,
  getScheduleTemplateById,
  updateScheduleTemplate,
  deleteScheduleTemplate
} from './handlers/schedule_templates';

import {
  createTimeSlot,
  getTimeSlotsByTemplate,
  getTimeSlotsByTemplateAndDay,
  getTimeSlotById,
  updateTimeSlot,
  deleteTimeSlot,
  deleteTimeSlotsByTemplate
} from './handlers/time_slots';

import {
  createJtmAssignment,
  getJtmAssignmentsByAcademicYear,
  getJtmAssignmentsByTeacher,
  getJtmAssignmentsByClass,
  getJtmAssignmentById,
  updateJtmAssignment,
  deleteJtmAssignment,
  getJtmAllocationProgress,
  validateJtmAllocation
} from './handlers/jtm_assignments';

import {
  createTaskAssignment,
  getTaskAssignmentsByAcademicYear,
  getTaskAssignmentsByTeacher,
  getTaskAssignmentById,
  updateTaskAssignment,
  deleteTaskAssignment,
  getTaskAllocationChartData
} from './handlers/task_assignments';

import {
  calculateTeacherWorkload,
  getAllTeacherWorkloads,
  getTeachersByWorkloadStatus,
  getWorkloadValidationSummary,
  getTeacherWorkloadDetails
} from './handlers/teacher_workload';

import {
  createSchedule,
  getSchedulesByClass,
  getSchedulesByTeacher,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  generateAutomaticSchedule,
  validateScheduleConflicts,
  getScheduleSummaryByClass,
  saveCachedSchedule,
  clearCachedSchedule
} from './handlers/schedules';

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
} from './handlers/sk_documents';

import {
  generateScheduleReportByClass,
  generateScheduleReportByTeacher,
  generateWorkloadReport,
  generateJtmAllocationReport,
  generateTaskAllocationReport,
  getReportFilters
} from './handlers/reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Schools
  createSchool: publicProcedure
    .input(createSchoolInputSchema)
    .mutation(({ input }) => createSchool(input)),
  getSchools: publicProcedure
    .query(() => getSchools()),
  getSchoolById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSchoolById(input.id)),
  updateSchool: publicProcedure
    .input(updateSchoolInputSchema)
    .mutation(({ input }) => updateSchool(input)),
  deleteSchool: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSchool(input.id)),

  // Teachers
  createTeacher: publicProcedure
    .input(createTeacherInputSchema)
    .mutation(({ input }) => createTeacher(input)),
  getTeachers: publicProcedure
    .query(() => getTeachers()),
  getTeacherById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTeacherById(input.id)),
  updateTeacher: publicProcedure
    .input(updateTeacherInputSchema)
    .mutation(({ input }) => updateTeacher(input)),
  deleteTeacher: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTeacher(input.id)),

  // Academic Years
  createAcademicYear: publicProcedure
    .input(createAcademicYearInputSchema)
    .mutation(({ input }) => createAcademicYear(input)),
  getAcademicYears: publicProcedure
    .query(() => getAcademicYears()),
  getAcademicYearById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAcademicYearById(input.id)),
  getActiveAcademicYear: publicProcedure
    .query(() => getActiveAcademicYear()),
  updateAcademicYear: publicProcedure
    .input(updateAcademicYearInputSchema)
    .mutation(({ input }) => updateAcademicYear(input)),
  setActiveAcademicYear: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => setActiveAcademicYear(input.id)),
  deleteAcademicYear: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAcademicYear(input.id)),

  // Classes
  createClass: publicProcedure
    .input(createClassInputSchema)
    .mutation(({ input }) => createClass(input)),
  getClasses: publicProcedure
    .query(() => getClasses()),
  getClassesByAcademicYear: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getClassesByAcademicYear(input.academicYearId)),
  getClassById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getClassById(input.id)),
  updateClass: publicProcedure
    .input(updateClassInputSchema)
    .mutation(({ input }) => updateClass(input)),
  deleteClass: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteClass(input.id)),

  // Subjects
  createSubject: publicProcedure
    .input(createSubjectInputSchema)
    .mutation(({ input }) => createSubject(input)),
  getSubjects: publicProcedure
    .query(() => getSubjects()),
  getSubjectById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSubjectById(input.id)),
  getSubjectByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(({ input }) => getSubjectByCode(input.code)),
  updateSubject: publicProcedure
    .input(updateSubjectInputSchema)
    .mutation(({ input }) => updateSubject(input)),
  deleteSubject: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSubject(input.id)),

  // Additional Tasks
  createAdditionalTask: publicProcedure
    .input(createAdditionalTaskInputSchema)
    .mutation(({ input }) => createAdditionalTask(input)),
  getAdditionalTasks: publicProcedure
    .query(() => getAdditionalTasks()),
  getAdditionalTaskById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAdditionalTaskById(input.id)),
  updateAdditionalTask: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      jp_equivalent: z.number().optional()
    }))
    .mutation(({ input }) => updateAdditionalTask(input)),
  deleteAdditionalTask: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAdditionalTask(input.id)),

  // Schedule Templates
  createScheduleTemplate: publicProcedure
    .input(createScheduleTemplateInputSchema)
    .mutation(({ input }) => createScheduleTemplate(input)),
  getScheduleTemplates: publicProcedure
    .query(() => getScheduleTemplates()),
  getScheduleTemplateById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getScheduleTemplateById(input.id)),
  updateScheduleTemplate: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional()
    }))
    .mutation(({ input }) => updateScheduleTemplate(input)),
  deleteScheduleTemplate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteScheduleTemplate(input.id)),

  // Time Slots
  createTimeSlot: publicProcedure
    .input(createTimeSlotInputSchema)
    .mutation(({ input }) => createTimeSlot(input)),
  getTimeSlotsByTemplate: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .query(({ input }) => getTimeSlotsByTemplate(input.templateId)),
  getTimeSlotsByTemplateAndDay: publicProcedure
    .input(z.object({ templateId: z.number(), dayOfWeek: z.number() }))
    .query(({ input }) => getTimeSlotsByTemplateAndDay(input.templateId, input.dayOfWeek)),
  getTimeSlotById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTimeSlotById(input.id)),
  updateTimeSlot: publicProcedure
    .input(z.object({
      id: z.number()
    }).merge(createTimeSlotInputSchema.partial()))
    .mutation(({ input }) => updateTimeSlot(input)),
  deleteTimeSlot: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTimeSlot(input.id)),
  deleteTimeSlotsByTemplate: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(({ input }) => deleteTimeSlotsByTemplate(input.templateId)),

  // JTM Assignments
  createJtmAssignment: publicProcedure
    .input(createJtmAssignmentInputSchema)
    .mutation(({ input }) => createJtmAssignment(input)),
  getJtmAssignmentsByAcademicYear: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getJtmAssignmentsByAcademicYear(input.academicYearId)),
  getJtmAssignmentsByTeacher: publicProcedure
    .input(z.object({ teacherId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getJtmAssignmentsByTeacher(input.teacherId, input.academicYearId)),
  getJtmAssignmentsByClass: publicProcedure
    .input(z.object({ classId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getJtmAssignmentsByClass(input.classId, input.academicYearId)),
  getJtmAssignmentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getJtmAssignmentById(input.id)),
  updateJtmAssignment: publicProcedure
    .input(z.object({
      id: z.number()
    }).merge(createJtmAssignmentInputSchema.partial()))
    .mutation(({ input }) => updateJtmAssignment(input)),
  deleteJtmAssignment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteJtmAssignment(input.id)),
  getJtmAllocationProgress: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getJtmAllocationProgress(input.academicYearId)),
  validateJtmAllocation: publicProcedure
    .input(createJtmAssignmentInputSchema)
    .mutation(({ input }) => validateJtmAllocation(input)),

  // Task Assignments
  createTaskAssignment: publicProcedure
    .input(createTaskAssignmentInputSchema)
    .mutation(({ input }) => createTaskAssignment(input)),
  getTaskAssignmentsByAcademicYear: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getTaskAssignmentsByAcademicYear(input.academicYearId)),
  getTaskAssignmentsByTeacher: publicProcedure
    .input(z.object({ teacherId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getTaskAssignmentsByTeacher(input.teacherId, input.academicYearId)),
  getTaskAssignmentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTaskAssignmentById(input.id)),
  updateTaskAssignment: publicProcedure
    .input(z.object({
      id: z.number()
    }).merge(createTaskAssignmentInputSchema.partial()))
    .mutation(({ input }) => updateTaskAssignment(input)),
  deleteTaskAssignment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTaskAssignment(input.id)),
  getTaskAllocationChartData: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getTaskAllocationChartData(input.academicYearId)),

  // Teacher Workload
  calculateTeacherWorkload: publicProcedure
    .input(z.object({ teacherId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => calculateTeacherWorkload(input.teacherId, input.academicYearId)),
  getAllTeacherWorkloads: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getAllTeacherWorkloads(input.academicYearId)),
  getTeachersByWorkloadStatus: publicProcedure
    .input(z.object({ academicYearId: z.number(), status: workloadStatusEnum }))
    .query(({ input }) => getTeachersByWorkloadStatus(input.academicYearId, input.status)),
  getWorkloadValidationSummary: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getWorkloadValidationSummary(input.academicYearId)),
  getTeacherWorkloadDetails: publicProcedure
    .input(z.object({ teacherId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getTeacherWorkloadDetails(input.teacherId, input.academicYearId)),

  // Schedules
  createSchedule: publicProcedure
    .input(createScheduleInputSchema)
    .mutation(({ input }) => createSchedule(input)),
  getSchedulesByClass: publicProcedure
    .input(z.object({ classId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getSchedulesByClass(input.classId, input.academicYearId)),
  getSchedulesByTeacher: publicProcedure
    .input(z.object({ teacherId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getSchedulesByTeacher(input.teacherId, input.academicYearId)),
  getScheduleById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getScheduleById(input.id)),
  updateSchedule: publicProcedure
    .input(updateScheduleInputSchema)
    .mutation(({ input }) => updateSchedule(input)),
  deleteSchedule: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSchedule(input.id)),
  generateAutomaticSchedule: publicProcedure
    .input(z.object({
      classId: z.number(),
      academicYearId: z.number(),
      templateId: z.number()
    }))
    .mutation(({ input }) => generateAutomaticSchedule(input.classId, input.academicYearId, input.templateId)),
  validateScheduleConflicts: publicProcedure
    .input(createScheduleInputSchema)
    .mutation(({ input }) => validateScheduleConflicts(input)),
  getScheduleSummaryByClass: publicProcedure
    .input(z.object({ classId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => getScheduleSummaryByClass(input.classId, input.academicYearId)),
  saveCachedSchedule: publicProcedure
    .input(z.object({ classId: z.number(), academicYearId: z.number() }))
    .mutation(({ input }) => saveCachedSchedule(input.classId, input.academicYearId)),
  clearCachedSchedule: publicProcedure
    .input(z.object({ classId: z.number(), academicYearId: z.number() }))
    .mutation(({ input }) => clearCachedSchedule(input.classId, input.academicYearId)),

  // SK Documents
  createSkDocumentTemplate: publicProcedure
    .input(createSkDocumentTemplateInputSchema)
    .mutation(({ input }) => createSkDocumentTemplate(input)),
  getSkDocumentTemplates: publicProcedure
    .query(() => getSkDocumentTemplates()),
  getSkDocumentTemplateById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSkDocumentTemplateById(input.id)),
  updateSkDocumentTemplate: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      template_content: z.string().optional()
    }))
    .mutation(({ input }) => updateSkDocumentTemplate(input)),
  deleteSkDocumentTemplate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSkDocumentTemplate(input.id)),
  generateSkDocument: publicProcedure
    .input(createSkDocumentInputSchema)
    .mutation(({ input }) => generateSkDocument(input)),
  getSkDocumentsByAcademicYear: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getSkDocumentsByAcademicYear(input.academicYearId)),
  getSkDocumentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSkDocumentById(input.id)),
  updateSkDocument: publicProcedure
    .input(z.object({
      id: z.number(),
      document_number: z.string().optional(),
      creation_date: z.coerce.date().optional()
    }))
    .mutation(({ input }) => updateSkDocument(input)),
  deleteSkDocument: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSkDocument(input.id)),
  previewSkDocument: publicProcedure
    .input(z.object({ templateId: z.number(), academicYearId: z.number() }))
    .query(({ input }) => previewSkDocument(input.templateId, input.academicYearId)),
  exportSkDocumentToPdf: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(({ input }) => exportSkDocumentToPdf(input.documentId)),

  // Reports
  generateScheduleReportByClass: publicProcedure
    .input(z.object({
      classId: z.number(),
      academicYearId: z.number(),
      format: z.enum(['pdf', 'excel']).optional()
    }))
    .mutation(({ input }) => generateScheduleReportByClass(input.classId, input.academicYearId, input.format)),
  generateScheduleReportByTeacher: publicProcedure
    .input(z.object({
      teacherId: z.number(),
      academicYearId: z.number(),
      format: z.enum(['pdf', 'excel']).optional()
    }))
    .mutation(({ input }) => generateScheduleReportByTeacher(input.teacherId, input.academicYearId, input.format)),
  generateWorkloadReport: publicProcedure
    .input(z.object({
      academicYearId: z.number(),
      format: z.enum(['pdf', 'excel']).optional()
    }))
    .mutation(({ input }) => generateWorkloadReport(input.academicYearId, input.format)),
  generateJtmAllocationReport: publicProcedure
    .input(z.object({
      academicYearId: z.number(),
      format: z.enum(['pdf', 'excel']).optional()
    }))
    .mutation(({ input }) => generateJtmAllocationReport(input.academicYearId, input.format)),
  generateTaskAllocationReport: publicProcedure
    .input(z.object({
      academicYearId: z.number(),
      format: z.enum(['pdf', 'excel']).optional()
    }))
    .mutation(({ input }) => generateTaskAllocationReport(input.academicYearId, input.format)),
  getReportFilters: publicProcedure
    .input(z.object({ academicYearId: z.number() }))
    .query(({ input }) => getReportFilters(input.academicYearId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();