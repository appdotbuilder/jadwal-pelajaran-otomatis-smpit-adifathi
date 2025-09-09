import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timeSlotsTable, scheduleTemplatesTable } from '../db/schema';
import { type CreateTimeSlotInput, type CreateScheduleTemplateInput } from '../schema';
import { 
  createTimeSlot, 
  getTimeSlotsByTemplate, 
  getTimeSlotsByTemplateAndDay,
  getTimeSlotById,
  updateTimeSlot,
  deleteTimeSlot,
  deleteTimeSlotsByTemplate
} from '../handlers/time_slots';
import { eq, and } from 'drizzle-orm';

// Test input data
const testTemplateInput: CreateScheduleTemplateInput = {
  name: 'Standard Schedule',
  description: 'Standard weekly schedule template'
};

const testTimeSlotInput: CreateTimeSlotInput = {
  template_id: 1, // Will be updated after template creation
  day_of_week: 1, // Monday
  jp_number: 1,
  start_time: '08:00',
  end_time: '08:40',
  duration: 40,
  slot_type: 'belajar'
};

const testTimeSlotInput2: CreateTimeSlotInput = {
  template_id: 1, // Will be updated after template creation
  day_of_week: 1, // Monday
  jp_number: 2,
  start_time: '08:40',
  end_time: '09:20',
  duration: 40,
  slot_type: 'belajar'
};

const testTimeSlotInputTuesday: CreateTimeSlotInput = {
  template_id: 1, // Will be updated after template creation
  day_of_week: 2, // Tuesday
  jp_number: 1,
  start_time: '08:00',
  end_time: '08:40',
  duration: 40,
  slot_type: 'istirahat'
};

describe('createTimeSlot', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a time slot successfully', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const result = await createTimeSlot(input);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.template_id).toEqual(template.id);
    expect(result.day_of_week).toEqual(1);
    expect(result.jp_number).toEqual(1);
    expect(result.start_time).toEqual('08:00');
    expect(result.end_time).toEqual('08:40');
    expect(result.duration).toEqual(40);
    expect(result.slot_type).toEqual('belajar');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save time slot to database', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const result = await createTimeSlot(input);

    // Verify database record
    const timeSlots = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.id, result.id))
      .execute();

    expect(timeSlots).toHaveLength(1);
    expect(timeSlots[0].template_id).toEqual(template.id);
    expect(timeSlots[0].day_of_week).toEqual(1);
    expect(timeSlots[0].jp_number).toEqual(1);
    expect(timeSlots[0].start_time).toEqual('08:00');
    expect(timeSlots[0].end_time).toEqual('08:40');
    expect(timeSlots[0].duration).toEqual(40);
    expect(timeSlots[0].slot_type).toEqual('belajar');
  });

  it('should throw error when template does not exist', async () => {
    const input = { ...testTimeSlotInput, template_id: 999 };

    await expect(createTimeSlot(input)).rejects.toThrow(/template.*not found/i);
  });

  it('should create time slots with different slot types', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    // Test different slot types
    const slotTypes = ['belajar', 'sholat_dhuha', 'istirahat', 'shalat_dzuhur_berjamaah', 'halaqoh_quran', 'program_pembiasaan', 'upacara'] as const;

    for (let i = 0; i < slotTypes.length; i++) {
      const input = {
        ...testTimeSlotInput,
        template_id: template.id,
        jp_number: i + 1,
        slot_type: slotTypes[i]
      };

      const result = await createTimeSlot(input);
      expect(result.slot_type).toEqual(slotTypes[i]);
    }
  });
});

describe('getTimeSlotsByTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return time slots for specific template', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    // Create multiple time slots for the template
    const input1 = { ...testTimeSlotInput, template_id: template.id };
    const input2 = { ...testTimeSlotInput2, template_id: template.id };

    await createTimeSlot(input1);
    await createTimeSlot(input2);

    const result = await getTimeSlotsByTemplate(template.id);

    expect(result).toHaveLength(2);
    expect(result[0].template_id).toEqual(template.id);
    expect(result[1].template_id).toEqual(template.id);
  });

  it('should return empty array when template has no time slots', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    const result = await getTimeSlotsByTemplate(template.id);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent template', async () => {
    const result = await getTimeSlotsByTemplate(999);

    expect(result).toHaveLength(0);
  });
});

describe('getTimeSlotsByTemplateAndDay', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return time slots for specific template and day', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    // Create time slots for different days
    const mondaySlot = { ...testTimeSlotInput, template_id: template.id, day_of_week: 1 };
    const tuesdaySlot = { ...testTimeSlotInputTuesday, template_id: template.id, day_of_week: 2 };

    await createTimeSlot(mondaySlot);
    await createTimeSlot(tuesdaySlot);

    const mondayResult = await getTimeSlotsByTemplateAndDay(template.id, 1);
    const tuesdayResult = await getTimeSlotsByTemplateAndDay(template.id, 2);

    expect(mondayResult).toHaveLength(1);
    expect(mondayResult[0].day_of_week).toEqual(1);
    expect(tuesdayResult).toHaveLength(1);
    expect(tuesdayResult[0].day_of_week).toEqual(2);
  });

  it('should return empty array when no time slots for specific day', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    const result = await getTimeSlotsByTemplateAndDay(template.id, 3);

    expect(result).toHaveLength(0);
  });
});

describe('getTimeSlotById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return time slot by ID', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const created = await createTimeSlot(input);
    const result = await getTimeSlotById(created.id);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(created.id);
    expect(result?.template_id).toEqual(template.id);
    expect(result?.start_time).toEqual('08:00');
  });

  it('should return null for non-existent ID', async () => {
    const result = await getTimeSlotById(999);

    expect(result).toBeNull();
  });
});

describe('updateTimeSlot', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update time slot successfully', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const created = await createTimeSlot(input);

    const updateData = {
      id: created.id,
      start_time: '09:00',
      end_time: '09:40',
      slot_type: 'istirahat' as const
    };

    const result = await updateTimeSlot(updateData);

    expect(result.id).toEqual(created.id);
    expect(result.start_time).toEqual('09:00');
    expect(result.end_time).toEqual('09:40');
    expect(result.slot_type).toEqual('istirahat');
    expect(result.template_id).toEqual(template.id); // Unchanged field
  });

  it('should update time slot in database', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const created = await createTimeSlot(input);

    const updateData = {
      id: created.id,
      duration: 45
    };

    await updateTimeSlot(updateData);

    // Verify database update
    const timeSlots = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.id, created.id))
      .execute();

    expect(timeSlots[0].duration).toEqual(45);
  });

  it('should throw error when time slot does not exist', async () => {
    const updateData = {
      id: 999,
      start_time: '09:00'
    };

    await expect(updateTimeSlot(updateData)).rejects.toThrow(/time slot.*not found/i);
  });

  it('should throw error when updating to non-existent template', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const created = await createTimeSlot(input);

    const updateData = {
      id: created.id,
      template_id: 999
    };

    await expect(updateTimeSlot(updateData)).rejects.toThrow(/template.*not found/i);
  });
});

describe('deleteTimeSlot', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete time slot successfully', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const created = await createTimeSlot(input);

    const result = await deleteTimeSlot(created.id);

    expect(result).toBe(true);
  });

  it('should remove time slot from database', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];
    const input = { ...testTimeSlotInput, template_id: template.id };

    const created = await createTimeSlot(input);

    await deleteTimeSlot(created.id);

    // Verify database deletion
    const timeSlots = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.id, created.id))
      .execute();

    expect(timeSlots).toHaveLength(0);
  });

  it('should return false for non-existent time slot', async () => {
    const result = await deleteTimeSlot(999);

    expect(result).toBe(false);
  });
});

describe('deleteTimeSlotsByTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete all time slots for template', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    // Create multiple time slots for the template
    const input1 = { ...testTimeSlotInput, template_id: template.id };
    const input2 = { ...testTimeSlotInput2, template_id: template.id };

    await createTimeSlot(input1);
    await createTimeSlot(input2);

    const result = await deleteTimeSlotsByTemplate(template.id);

    expect(result).toBe(true);
  });

  it('should remove all time slots from database', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    // Create multiple time slots for the template
    const input1 = { ...testTimeSlotInput, template_id: template.id };
    const input2 = { ...testTimeSlotInput2, template_id: template.id };

    await createTimeSlot(input1);
    await createTimeSlot(input2);

    await deleteTimeSlotsByTemplate(template.id);

    // Verify database deletion
    const timeSlots = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.template_id, template.id))
      .execute();

    expect(timeSlots).toHaveLength(0);
  });

  it('should return false when no time slots exist for template', async () => {
    // Create prerequisite template
    const templateResult = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template = templateResult[0];

    const result = await deleteTimeSlotsByTemplate(template.id);

    expect(result).toBe(false);
  });

  it('should only delete time slots for specified template', async () => {
    // Create two templates
    const template1Result = await db.insert(scheduleTemplatesTable)
      .values(testTemplateInput)
      .returning()
      .execute();

    const template2Result = await db.insert(scheduleTemplatesTable)
      .values({ ...testTemplateInput, name: 'Alternative Schedule' })
      .returning()
      .execute();

    const template1 = template1Result[0];
    const template2 = template2Result[0];

    // Create time slots for both templates
    const input1 = { ...testTimeSlotInput, template_id: template1.id };
    const input2 = { ...testTimeSlotInput, template_id: template2.id };

    await createTimeSlot(input1);
    await createTimeSlot(input2);

    // Delete time slots for template1 only
    await deleteTimeSlotsByTemplate(template1.id);

    // Verify only template1 slots are deleted
    const template1Slots = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.template_id, template1.id))
      .execute();

    const template2Slots = await db.select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.template_id, template2.id))
      .execute();

    expect(template1Slots).toHaveLength(0);
    expect(template2Slots).toHaveLength(1);
  });
});