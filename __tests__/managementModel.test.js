const mongoose = require('mongoose');
const Management = require('../models/managementModel');

// Utilisation de MongoDB Memory Server pour les tests en mémoire
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongoServer;

// Avant de lancer les tests, on configure MongoDB en mémoire
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Après les tests, on déconnecte mongoose et on arrête MongoDB Memory Server
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Tests unitaires pour le modèle Management
describe('Management Model Test', () => {
  // Test pour vérifier la création et sauvegarde réussie d'une entité
  it('create & save management successfully', async () => {
    const validManagement = new Management({
      name: 'Test Management',
      logo: 'test_logo.png',
      email: 'test@example.com',
      emailNewCollaborator: 'newcollab@example.com',
      emailDeleteCollaborator: 'deletecollab@example.com',
      emailAbsenceCollaborator: 'absence@example.com',
      emailSalaryElement: 'salary@example.com',
      emailGeneratePaySlip: 'payslip@example.com',
      emailContact: 'contact@example.com',
    });
    const savedManagement = await validManagement.save();

    expect(savedManagement._id).toBeDefined();
    expect(savedManagement.name).toBe(validManagement.name);
    expect(savedManagement.logo).toBe(validManagement.logo);
    expect(savedManagement.email).toBe(validManagement.email);
    // Ajouter d'autres tests pour les autres champs si nécessaire
  });
  

  // Test pour vérifier les valeurs par défaut des champs numériques
  it('should have default values for numeric fields', async () => {
    const managementWithDefaults = new Management({
      name: 'Default Management',
      logo: 'default_logo.png',
      email: 'default@example.com',
    });
    const savedManagement = await managementWithDefaults.save();

    expect(savedManagement.newEmployee).toBe(0);
    expect(savedManagement.absence).toBe(0);
    expect(savedManagement.remove).toBe(0);
    expect(savedManagement.salary).toBe(0);
    expect(savedManagement.contact).toBe(0);
  });

  // Test pour vérifier le champ 'suspended' par défaut
  it('should have default value for suspended field', async () => {
    const managementWithDefaultSuspended = new Management({
      name: 'Suspended Management',
      logo: 'suspended_logo.png',
      email: 'suspended@example.com',
    });
    const savedManagement = await managementWithDefaultSuspended.save();

    expect(savedManagement.suspended).toBe(false);
  });
});
