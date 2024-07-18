const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Ressource = require('../models/ressourceModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Ressource Model Test', () => {
  it('create & save ressource successfully', async () => {
    const validRessource = new Ressource({
      name: 'Test Ressource',
      type: 'Test Type',
      code: '12345',
    });
    const savedRessource = await validRessource.save();

    expect(savedRessource._id).toBeDefined();
    expect(savedRessource.name).toBe(validRessource.name);
    expect(savedRessource.type).toBe(validRessource.type);
    expect(savedRessource.code).toBe(validRessource.code);
  });

  it('create ressource without required fields should fail', async () => {
    const ressourceWithoutRequiredField = new Ressource({ name: 'Test Ressource' });
    let err;
    try {
      await ressourceWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
    expect(err.errors.code).toBeDefined();
  });

  it('create ressource with only required fields should pass', async () => {
    const ressourceWithRequiredFields = new Ressource({
      name: 'Test Ressource',
      type: 'Test Type',
      code: '12345',
    });
    const savedRessource = await ressourceWithRequiredFields.save();

    expect(savedRessource._id).toBeDefined();
    expect(savedRessource.name).toBe('Test Ressource');
    expect(savedRessource.type).toBe('Test Type');
    expect(savedRessource.code).toBe('12345');
  });
});
