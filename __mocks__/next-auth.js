// Mock for next-auth to handle ES module issues in Jest

const mockAuth = jest.fn(() => ({
  auth: jest.fn(),
  handlers: { GET: jest.fn(), POST: jest.fn() },
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

const mockSignIn = jest.fn();
const mockSignOut = jest.fn();

// Export both default and named exports
module.exports = mockAuth;
module.exports.default = mockAuth;
module.exports.signIn = mockSignIn;
module.exports.signOut = mockSignOut;

// Mock providers
module.exports.providers = {
  google: jest.fn(() => ({
    id: 'google',
    name: 'Google',
  })),
};
