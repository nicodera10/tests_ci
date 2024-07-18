const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Entity = require('../models/entityModel');
const Management = require('../models/managementModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Entity Model Test', () => {
  it('create & save entity successfully', async () => {
    const managementData = { name: 'Test Management' };
    const savedManagement = await Management.create(managementData);

    const validEntity = new Entity({
      name: 'Test Entity',
      management: savedManagement._id,
      primes: [{ code: 'P1', name: 'Prime 1' }],
      absences: [{ code: 'A1', name: 'Absence 1' }],
      suspended: false,
      entryPrime: [{ matricule: 'M1', code: 'P1', value: 100 }],
      entryAbsence: [{ matricule: 'M1', code: 'A1', value: 2, startDate: '2024-01-01', endDate: '2024-01-02' }],
      informations: 'Test information'
    });

    const savedEntity = await validEntity.save();

    expect(savedEntity._id).toBeDefined();
    expect(savedEntity.name).toBe('Test Entity');
    expect(savedEntity.management).toEqual(savedManagement._id);
    expect(savedEntity.primes).toHaveLength(1);
    expect(savedEntity.absences).toHaveLength(1);
    expect(savedEntity.suspended).toBe(false);
    expect(savedEntity.entryPrime).toHaveLength(1);
    expect(savedEntity.entryAbsence).toHaveLength(1);
    expect(savedEntity.informations).toBe('Test information');
  });

  it('create entity without required field should fail', async () => {
    const entityWithoutRequiredField = new Entity({ name: 'Test Entity' });
    let err;
    try {
      await entityWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.management).toBeDefined();
  });

  it('should populate management field', async () => {
    const managementData = { name: 'Populate Test Management' };
    const savedManagement = await Management.create(managementData);

    const entityData = {
      name: 'Populate Test Entity',
      management: savedManagement._id
    };

    const savedEntity = await Entity.create(entityData);
    const populatedEntity = await Entity.findById(savedEntity._id);

    expect(populatedEntity.management).toBeDefined();
    expect(populatedEntity.management.name).toBe('Populate Test Management');
  });
});