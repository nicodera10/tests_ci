const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Employee = require('../models/employeeModel');
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

describe('Employee Model Test', () => {
  it('create & save employee successfully', async () => {
    const managementData = { name: 'Test Management' };
    const savedManagement = await Management.create(managementData);

    const entityData = { 
      name: 'Test Entity',
      management: savedManagement._id
    };
    const savedEntity = await Entity.create(entityData);

    const validEmployee = new Employee({
      civilite: 'M.',
      lastName: 'Doe',
      firstName: 'John',
      birthDate: '1990-01-01',
      ssNumber: '123456789',
      matricule: 'EMP001',
      mail: 'john.doe@example.com',
      contractType: 'CDI',
      dateBegin: '2024-01-01',
      salary: '3000',
      entity: savedEntity._id
    });

    const savedEmployee = await validEmployee.save();
    
    expect(savedEmployee._id).toBeDefined();
    expect(savedEmployee.lastName).toBe('Doe');
    expect(savedEmployee.firstName).toBe('John');
    expect(savedEmployee.isActive).toBe(true);
    expect(savedEmployee.entity.toString()).toBe(savedEntity._id.toString());
  });

  it('create employee without required field should fail', async () => {
    const employeeWithoutRequiredField = new Employee({ firstName: 'John' });
    let err;
    try {
      await employeeWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.lastName).toBeDefined();
  });

  it('should default isActive to true', async () => {
    const managementData = { name: 'Another Management' };
    const savedManagement = await Management.create(managementData);

    const entityData = { 
      name: 'Another Entity',
      management: savedManagement._id
    };
    const savedEntity = await Entity.create(entityData);

    const employee = new Employee({
      lastName: 'Smith',
      entity: savedEntity._id
    });

    const savedEmployee = await employee.save();
    expect(savedEmployee.isActive).toBe(true);
  });

  it('should populate entity field', async () => {
    const managementData = { name: 'Populate Test Management' };
    const savedManagement = await Management.create(managementData);

    const entityData = { 
      name: 'Populate Test Entity',
      management: savedManagement._id
    };
    const savedEntity = await Entity.create(entityData);

    const employeeData = {
      lastName: 'Johnson',
      entity: savedEntity._id
    };

    const savedEmployee = await Employee.create(employeeData);
    const populatedEmployee = await Employee.findById(savedEmployee._id).populate('entity');

    expect(populatedEmployee.entity).toBeDefined();
    expect(populatedEmployee.entity.name).toBe('Populate Test Entity');
  });

  it('should allow optional fields', async () => {
    const managementData = { name: 'Optional Fields Management' };
    const savedManagement = await Management.create(managementData);

    const entityData = { 
      name: 'Optional Fields Entity',
      management: savedManagement._id
    };
    const savedEntity = await Entity.create(entityData);

    const employeeWithOptionalFields = new Employee({
      lastName: 'Brown',
      entity: savedEntity._id,
      maidenName: 'Smith',
      country: 'France',
      houseNumber: '10',
      street: 'Rue de la Paix',
      zipCode: '75001',
      city: 'Paris',
      iban: 'FR1420041010050500013M02606',
      bic: 'SOGEFRPP'
    });

    const savedEmployee = await employeeWithOptionalFields.save();
    
    expect(savedEmployee.maidenName).toBe('Smith');
    expect(savedEmployee.country).toBe('France');
    expect(savedEmployee.houseNumber).toBe('10');
    expect(savedEmployee.street).toBe('Rue de la Paix');
    expect(savedEmployee.zipCode).toBe('75001');
    expect(savedEmployee.city).toBe('Paris');
    expect(savedEmployee.iban).toBe('FR1420041010050500013M02606');
    expect(savedEmployee.bic).toBe('SOGEFRPP');
  });

  it('should handle work schedule fields', async () => {
    const managementData = { name: 'Work Schedule Management' };
    const savedManagement = await Management.create(managementData);

    const entityData = { 
      name: 'Work Schedule Entity',
      management: savedManagement._id
    };
    const savedEntity = await Entity.create(entityData);

    const employeeWithSchedule = new Employee({
      lastName: 'Wilson',
      entity: savedEntity._id,
      mondayMorning: '09:00-12:00',
      mondayAfternoon: '13:00-18:00',
      fridayMorning: '09:00-12:00',
      fridayAfternoon: '13:00-17:00'
    });

    const savedEmployee = await employeeWithSchedule.save();
    
    expect(savedEmployee.mondayMorning).toBe('09:00-12:00');
    expect(savedEmployee.mondayAfternoon).toBe('13:00-18:00');
    expect(savedEmployee.fridayMorning).toBe('09:00-12:00');
    expect(savedEmployee.fridayAfternoon).toBe('13:00-17:00');
  });
});