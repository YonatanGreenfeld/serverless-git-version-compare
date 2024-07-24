const simpleGitMock = {
  revparse: jest.fn(),
  diffSummary: jest.fn(),
};
module.exports = jest.fn(() => simpleGitMock);
