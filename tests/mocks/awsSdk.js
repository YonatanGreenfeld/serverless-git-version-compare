const AWSMock = {
  request: jest.fn().mockResolvedValue({}),
  naming: {
    getStackName: jest.fn().mockReturnValue('mocked-stack-name'),
  },
};
module.exports = AWSMock;
