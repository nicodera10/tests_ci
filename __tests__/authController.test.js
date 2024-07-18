const { signToken, createSendToken, signupClient, login } = require('../controllers/authController');
const jwt = require("jsonwebtoken");
const User = require('../models/userModel');
const emailUtils = require('../utils/email');
const generator = require('generate-password');
const authController = require('../controllers/authController');
const mongoose = require('mongoose');
const Employee = require('../models/employeeModel');

process.env.JWT_SECRET = 'your_test_jwt_secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_COOKIE_EXPIRES_IN = '1';
process.env.NODE_ENV = 'production';    // Supposons que nous sommes en environnement de production

// Mocks
jest.mock('../models/userModel');
jest.mock('../models/entityModel');
jest.mock('../utils/email');
jest.mock('generate-password');
jest.mock('../utils/catchAsync', () => (fn) => {
  return (...args) => Promise.resolve(fn(...args)).catch(args[args.length - 1]);
});
jest.mock('../models/employeeModel'); // Mock le modèle Employee

/**
 * --------------------------------------------------------------------------------------------------
 */

describe('signToken function', () => {
  test('should return a valid JWT token', () => {
    const userId = 'user123';
    const token = signToken(userId);

    // Vérification que le token est une chaîne non vide
    expect(typeof token).toBe('string');
    expect(token).toBeTruthy();

    // Optionnel : Vérification de la structure du token JWT (pas nécessaire pour tous les tests)
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    expect(decodedToken.id).toBe(userId);
  });
});

/**
 * --------------------------------------------------------------------------------------------------
 */

describe('createSendToken function', () => {
  let user;
  let res;
  let status;

  beforeEach(() => {
    user = {
      _id: 'testid123',
      password: 'password123',
      role: 'employee',
      employeeId: 'employeeid456'
    };
    status = jest.fn().mockReturnThis();
    res = {
      cookie: jest.fn(),
      status: status,
      json: jest.fn()
    };
  });

  it('should sign a token and set a cookie for a user with role employee', async () => {
    const mockEmployee = {
      matricule: 'mat123',
      _id: 'empid123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      entity: 'entity1'
    };

    Employee.findOne.mockResolvedValue(mockEmployee);

    await createSendToken(user, 200, res);

    const cookieArgs = res.cookie.mock.calls[0];
    expect(cookieArgs[0]).toBe('jwt');
    expect(typeof cookieArgs[1]).toBe('string');
    expect(cookieArgs[2]).toEqual(expect.objectContaining({
      httpOnly: true
    }));
    expect(cookieArgs[2].expires).toBeInstanceOf(Date);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      token: expect.any(String),
      data: {
        user: {
          _id: 'testid123',
          password: undefined,
          role: 'employee',
          employeeId: 'employeeid456'
        },
        employee: {
          matricule: 'mat123',
          _id: 'empid123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          entity: 'entity1'
        },
        employeeId: 'employeeid456'
      }
    });
  });

  it('should sign a token and set a cookie for a user without role employee', async () => {
    user.role = 'user';

    await createSendToken(user, 200, res);

    const cookieArgs = res.cookie.mock.calls[0];
    expect(cookieArgs[0]).toBe('jwt');
    expect(typeof cookieArgs[1]).toBe('string');
    expect(cookieArgs[2]).toEqual(expect.objectContaining({
      httpOnly: true
    }));
    expect(cookieArgs[2].expires).toBeInstanceOf(Date);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      token: expect.any(String),
      data: {
        user: {
          _id: 'testid123',
          password: undefined,
          role: 'user',
          employeeId: 'employeeid456'
        },
        employee: null,
        employeeId: 'employeeid456'
      }
    });
  });

  it('should set secure cookie in production environment', () => {
    process.env.NODE_ENV = 'production';

    createSendToken(user, 200, res);

    const cookieArgs = res.cookie.mock.calls[0];
    expect(cookieArgs[0]).toBe('jwt');
    expect(typeof cookieArgs[1]).toBe('string');
    expect(cookieArgs[2]).toEqual(expect.objectContaining({
      httpOnly: true,
      secure: true
    }));
    expect(cookieArgs[2].expires).toBeInstanceOf(Date);

    // Reset NODE_ENV to test
    process.env.NODE_ENV = 'test';
  });

  it('should remove password from user output', async () => {
    const mockEmployee = {
      matricule: 'mat123',
      _id: 'empid123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      entity: 'entity1'
    };
  
    Employee.findOne.mockResolvedValue(mockEmployee);
  
    await createSendToken(user, 200, res);
  
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      token: expect.any(String),
      data: {
        user: {
          _id: 'testid123',
          password: undefined,
          role: 'employee',
          employeeId: 'employeeid456'
        },
        employee: {
          matricule: 'mat123',
          _id: 'empid123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          entity: 'entity1'
        },
        employeeId: 'employeeid456'
      }
    });
    expect(user.password).toBe(undefined);
  });
  
});

/**
 * --------------------------------------------------------------------------------------------------
 */

describe('signupClient', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        firstName: 'john',
        lastName: 'doe',
        email: 'john.doe@example.com',
        customerOf: 'someCustomer',
        role: 'user'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    next = jest.fn();

    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock generator.generate
    generator.generate.mockReturnValue('MockPassword123');

    // Mock User.create
    User.create.mockResolvedValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'MockPassword123',
      customerOf: 'someCustomer',
      role: 'user'
    });

    // Mock emailUtils.sendEmail
    emailUtils.sendEmail.mockResolvedValue();
  });

  test('formate correctement le prénom et le nom', async () => {
    await signupClient(req, res, next);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'John',
      lastName: 'Doe'
    }));
  });

  test('génère un mot de passe valide', async () => {
    await signupClient(req, res, next);
    expect(generator.generate).toHaveBeenCalledWith({
      length: 12,
      numbers: true,
      uppercase: true,
      lowercase: true,
      symbols: false,
      strict: true
    });
  });

  test('envoie un email avec les bonnes informations', async () => {
    await signupClient(req, res, next);
    expect(emailUtils.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      email: 'john.doe@example.com',
      subject: "Votre nouveau mot de passe Easy-Paies"
    }));
  });
});

/**
 * --------------------------------------------------------------------------------------------------
 */

describe('signup', () => {

  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        firstName: 'john',
        lastName: 'doe',
        email: 'john@example.com',
        password: 'password123',
        managerOf: [],
        role: 'user',
        customerOf: [],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle User.create failure', async () => {
    const error = new Error('Database error');
    User.create.mockRejectedValue(error);
    await authController.signup(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  test('formate correctement le prénom et le nom', async () => {
    await authController.signup(req, res, next);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'John',
      lastName: 'Doe'
    }));
  });
});
