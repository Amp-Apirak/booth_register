require('dotenv').config();
const db = require('../config/db');
const participantRepository = require('../repositories/participantRepository');
const checkinService = require('../services/checkinService');

describe('Smart Event Registration Integration Tests (ISO 9002)', () => {
  let testParticipantId = null;
  const testTicketCode = 'tkt_test_9999_jest';

  // Before all tests, ensure the DB connection is healthy
  beforeAll(async () => {
    await db.testConnection();
  });

  // After all tests, clean up mock entries and close the database pool connection
  afterAll(async () => {
    if (testParticipantId) {
      // 1. Delete mock check-ins
      await db.query('DELETE FROM checkins WHERE participant_id = $1', [testParticipantId]);
      // 2. Delete mock participant
      await participantRepository.delete(testParticipantId);
    }
    await db.pool.end();
  });

  test('REQ-01 & REQ-03: Should successfully register a new participant in PostgreSQL DB', async () => {
    const mockData = {
      name: 'Jest Test User',
      company: 'Test Jest Corporation',
      position: 'Quality Auditor',
      email: 'auditor@jest-test.com',
      phone: '099-123-4567',
      status: 'Pending',
      ticket_code: testTicketCode
    };

    // Trigger Repository Create
    const participant = await participantRepository.create(mockData);

    expect(participant).toBeDefined();
    expect(participant.id).toBeDefined();
    expect(participant.name).toBe(mockData.name);
    expect(participant.company).toBe(mockData.company);
    expect(participant.ticket_code).toBe(testTicketCode);
    expect(participant.status).toBe('Pending');

    testParticipantId = participant.id;
  });

  test('REQ-04: Should successfully check-in via checkinService with atomic database transaction', async () => {
    expect(testParticipantId).not.toBeNull();

    // Trigger Checkin Service
    const checkinResult = await checkinService.checkIn(testTicketCode);

    expect(checkinResult).toBeDefined();
    expect(checkinResult.id).toBe(testParticipantId);
    expect(checkinResult.status).toBe('Checked-in');
    expect(checkinResult.checked_in_at).toBeDefined();

    // Confirm that DB state matches Checked-in
    const freshRecord = await participantRepository.getById(testParticipantId);
    expect(freshRecord.status).toBe('Checked-in');

    // Confirm a log is inserted in the checkins table
    const checkinLogs = await db.query('SELECT * FROM checkins WHERE participant_id = $1', [testParticipantId]);
    expect(checkinLogs.rows.length).toBe(1);
  });

  test('REQ-04 Edge Case: Should fail and throw error if already checked-in', async () => {
    // Attempt second checkin
    await expect(checkinService.checkIn(testTicketCode)).rejects.toThrow('ALREADY_CHECKED_IN');
  });

  test('REQ-04 Edge Case: Should fail and throw error if ticket code does not exist', async () => {
    // Attempt checkin with invalid ticket
    await expect(checkinService.checkIn('tkt_invalid_non_existent')).rejects.toThrow('TICKET_NOT_FOUND');
  });
});
