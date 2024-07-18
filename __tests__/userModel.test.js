const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('User Model Test', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up the database after each test
    await User.deleteMany();
  });

  it('create & save user successfully', async () => {
    const validUser = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    const savedUser = await validUser.save();

    // Fetch the user from the database
    const fetchedUser = await User.findById(savedUser._id).select('+password');

    // Check that the saved user's properties match the input
    expect(fetchedUser._id).toBeDefined();
    expect(fetchedUser.lastName).toBe(validUser.lastName);
    expect(fetchedUser.firstName).toBe(validUser.firstName);
    expect(fetchedUser.email).toBe(validUser.email);

    // Use bcrypt.compare to verify that the password has been hashed
    const isMatch = await bcrypt.compare('password123', fetchedUser.password);
    expect(isMatch).toBe(true);
  });

  it('requires lastName, firstName, email, and password', async () => {
    const userWithoutRequiredFields = new User();
    let err;
    try {
      await userWithoutRequiredFields.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.lastName).toBeDefined();
    expect(err.errors.firstName).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it('correctPassword method returns true for correct password', async () => {
    const user = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    await user.save();

    const fetchedUser = await User.findById(user._id).select('+password');
    const isCorrectPassword = await fetchedUser.correctPassword('password123', fetchedUser.password);
    expect(isCorrectPassword).toBe(true);
  });

  it('correctPassword method returns false for incorrect password', async () => {
    const user = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    await user.save();

    const fetchedUser = await User.findById(user._id).select('+password');
    const isCorrectPassword = await fetchedUser.correctPassword('wrongpassword', fetchedUser.password);
    expect(isCorrectPassword).toBe(false);
  });

  it('changedPasswordAfter method returns true if password was changed after token issuance', async () => {
    const user = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    await user.save();

    user.passwordChangedAt = Date.now() - 2000; // password changed 2 seconds ago
    await user.save();

    const changed = user.changedPasswordAfter(Date.now() / 1000 - 3); // token issued 3 seconds ago
    expect(changed).toBe(true);
  });

  it('changedPasswordAfter method returns false if password was not changed after token issuance', async () => {
    const user = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    await user.save();

    const changed = user.changedPasswordAfter(Date.now() / 1000 + 3); // token issued in future
    expect(changed).toBe(false);
  });

  it('createPasswordResetToken method generates a token', async () => {
    const user = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    await user.save();

    const resetToken = user.createPasswordResetToken();
    expect(resetToken).toBeDefined();
    expect(user.passwordResetToken).toBeDefined();
  });

  it('createEmailToken method generates an email validation token', async () => {
    const user = new User({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      password: 'password123',
    });
    await user.save();

    const emailToken = user.createEmailToken();
    expect(emailToken).toBeDefined();
    expect(user.mailValidationToken).toBeDefined();
    expect(user.mailValidationExpires).toBeDefined();
  });
});
