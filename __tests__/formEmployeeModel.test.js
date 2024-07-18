const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const FormEmployee = require('../models/formEmployeeModel');
const Entity = require('../models/entityModel'); // Assuming you have an entity model
const Management = require('../models/managementModel'); // Assuming you have a management model

let mongoServer;
let validManagement;
let savedManagement;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

beforeEach(async () => {
  validManagement = new Management({ name: `Test Management ${Date.now()}` });
  savedManagement = await validManagement.save();
});

afterEach(async () => {
  await FormEmployee.deleteMany({});
  await Entity.deleteMany({});
  await Management.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('FormEmployee Model Test', () => {
  it('create & save formEmployee successfully', async () => {
    const validEntity = new Entity({
      name: 'Test Entity',
      management: savedManagement._id,  // Use ObjectId
    });
    const savedEntity = await validEntity.save();

    const validFormEmployee = new FormEmployee({
      lastName: 'Doe',
      entity: savedEntity._id,
    });

    const savedFormEmployee = await validFormEmployee.save();

    expect(savedFormEmployee._id).toBeDefined();
    expect(savedFormEmployee.lastName).toBe(validFormEmployee.lastName);
    expect(savedFormEmployee.entity).toEqual(savedEntity._id);
    expect(savedFormEmployee.isActive).toBe(true);
  });

  it('create formEmployee without required fields should fail', async () => {
    const formEmployeeWithoutRequiredField = new FormEmployee({});
    let err;
    try {
      await formEmployeeWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.lastName).toBeDefined();
  });

  it('populate entity reference', async () => {
    const validEntity = new Entity({
      name: 'Test Entity',
      management: savedManagement._id,  // Use ObjectId
    });
    const savedEntity = await validEntity.save();

    const validFormEmployee = new FormEmployee({
      lastName: 'Doe',
      entity: savedEntity._id,
    });

    const savedFormEmployee = await validFormEmployee.save();
    const foundFormEmployee = await FormEmployee.findById(savedFormEmployee._id).populate('entity').exec();

    expect(foundFormEmployee.entity._id).toEqual(savedEntity._id);
    expect(foundFormEmployee.entity.name).toBe('Test Entity');
  });

  it('default isActive to true', async () => {
    const validEntity = new Entity({
      name: 'Test Entity',
      management: savedManagement._id,  // Use ObjectId
    });
    const savedEntity = await validEntity.save();

    const validFormEmployee = new FormEmployee({
      lastName: 'Doe',
      entity: savedEntity._id,
    });

    const savedFormEmployee = await validFormEmployee.save();

    expect(savedFormEmployee.isActive).toBe(true);
  });
});
