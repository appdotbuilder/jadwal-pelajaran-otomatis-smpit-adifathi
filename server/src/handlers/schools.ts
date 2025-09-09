import { db } from '../db';
import { schoolsTable } from '../db/schema';
import { type CreateSchoolInput, type UpdateSchoolInput, type School } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new school record
 * Handles school master data creation including name, NPSN, address, principal info, and logos
 */
export const createSchool = async (input: CreateSchoolInput): Promise<School> => {
  try {
    const result = await db.insert(schoolsTable)
      .values({
        name: input.name,
        npsn: input.npsn,
        address: input.address,
        principal_name: input.principal_name,
        principal_nip: input.principal_nip,
        logo_url: input.logo_url,
        letterhead_url: input.letterhead_url
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('School creation failed:', error);
    throw error;
  }
};

/**
 * Get all schools
 * Returns list of all schools in the system
 */
export const getSchools = async (): Promise<School[]> => {
  try {
    const results = await db.select()
      .from(schoolsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Schools retrieval failed:', error);
    throw error;
  }
};

/**
 * Get school by ID
 * Returns specific school details by ID
 */
export const getSchoolById = async (id: number): Promise<School | null> => {
  try {
    const results = await db.select()
      .from(schoolsTable)
      .where(eq(schoolsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('School retrieval by ID failed:', error);
    throw error;
  }
};

/**
 * Update school information
 * Updates existing school record with new data
 */
export const updateSchool = async (input: UpdateSchoolInput): Promise<School> => {
  try {
    // Extract ID from input
    const { id, ...updateData } = input;

    // Build update object with only provided fields
    const fieldsToUpdate: Partial<typeof updateData> = {};
    if (updateData.name !== undefined) fieldsToUpdate.name = updateData.name;
    if (updateData.npsn !== undefined) fieldsToUpdate.npsn = updateData.npsn;
    if (updateData.address !== undefined) fieldsToUpdate.address = updateData.address;
    if (updateData.principal_name !== undefined) fieldsToUpdate.principal_name = updateData.principal_name;
    if (updateData.principal_nip !== undefined) fieldsToUpdate.principal_nip = updateData.principal_nip;
    if (updateData.logo_url !== undefined) fieldsToUpdate.logo_url = updateData.logo_url;
    if (updateData.letterhead_url !== undefined) fieldsToUpdate.letterhead_url = updateData.letterhead_url;

    const result = await db.update(schoolsTable)
      .set(fieldsToUpdate)
      .where(eq(schoolsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`School with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('School update failed:', error);
    throw error;
  }
};

/**
 * Delete school by ID
 * Removes school record from database
 */
export const deleteSchool = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(schoolsTable)
      .where(eq(schoolsTable.id, id))
      .execute();

    // Return true if a record was deleted (rowCount > 0)
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('School deletion failed:', error);
    throw error;
  }
};