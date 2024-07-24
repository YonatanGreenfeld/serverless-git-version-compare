const GitVersionComparePlugin = require('../src/plugin');
const AWS = require('./mocks/awsSdk');
const log = require('./mocks/log');

jest.mock('simple-git', () => require('./mocks/simpleGit'));
const simpleGit = require('simple-git')(); // Import the mocked instance

describe('GitVersionComparePlugin', () => {
  let options, plugin, serverless;

  const processExitMock = jest.fn();

  beforeEach(() => {
    process.exit = processExitMock;
    serverless = {
      service: {
        custom: {
          gitVersionCompare: {},
        },
        provider: {
          stackTags: {},
        },
      },
      getProvider: jest.fn().mockReturnValue(AWS),
      addServiceOutputSection: jest.fn(),
      configSchemaHandler: {
        defineCustomProperties: jest.fn(),
      },
    };
    options = {};
    plugin = new GitVersionComparePlugin(serverless, options, { log });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Flow Checks', () => {
    it('should skip deployment if commits are the same and not dirty', async () => {
      simpleGit.revparse.mockResolvedValue('abc123');
      simpleGit.diffSummary.mockResolvedValue({ changed: 0, insertions: 0, deletions: 0 });
      AWS.request.mockResolvedValue({
        Stacks: [
          {
            Tags: [{ Key: 'GIT_VERSION_COMMIT', Value: 'abc123' }],
          },
        ],
      });
      await plugin.checkStackTag();
      expect(log.success).toHaveBeenCalledWith('Deployed commit is the same as HEAD commit - skipping deployment');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should add tag to stack if commits are different', async () => {
      simpleGit.revparse.mockResolvedValue('abc123');
      simpleGit.diffSummary.mockResolvedValue({ changed: 0, insertions: 0, deletions: 0 });
      AWS.request.mockResolvedValue({
        Stacks: [
          {
            Tags: [{ Key: 'GIT_VERSION_COMMIT', Value: 'def456' }],
          },
        ],
      });
      await plugin.checkStackTag();
      expect(log.info).toHaveBeenCalledWith('Adding tag GIT_VERSION_COMMIT with value abc123 to stack tags');
      expect(serverless.service.provider.stackTags).toEqual({ GIT_VERSION_COMMIT: 'abc123' });
    });

    it('should log deployed commit on command run', async () => {
      AWS.request.mockResolvedValue({
        Stacks: [
          {
            Tags: [{ Key: 'GIT_VERSION_COMMIT', Value: 'abc123' }],
          },
        ],
      });
      await plugin.logDeployedCommitCommand();
      expect(log.success).toHaveBeenCalledWith('The last deployed commit is: abc123');
    });
  });

  describe('Configuration Checks', () => {
    it('should do nothing if disabled', async () => {
      plugin.config.enabled = false;
      await plugin.checkStackTag();
      expect(log.info).toHaveBeenCalledWith('Git version compare is disabled - skipping check');
    });

    it('should always deploy if options.force is true', async () => {
      plugin.options.force = true;
      await plugin.checkStackTag();
      expect(log.notice).toHaveBeenCalledWith(
        'Force flag detected - deployment will continue regardless of commit hash',
      );
    });

    it('should not deploy if dirty but alwaysDeployDirty is false', async () => {
      plugin.config.alwaysDeployDirty = false;
      simpleGit.revparse.mockResolvedValue('abc123');
      simpleGit.diffSummary.mockResolvedValue({ changed: 1, insertions: 0, deletions: 0 });
      AWS.request.mockResolvedValue({
        Stacks: [
          {
            Tags: [{ Key: 'GIT_VERSION_COMMIT', Value: 'abc123' }],
          },
        ],
      });
      await plugin.checkStackTag();
      expect(log.success).toHaveBeenCalledWith('Deployed commit is the same as HEAD commit - skipping deployment');
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('Git Behavior Checks', () => {
    it('should always deploy if running outside of a git repo', async () => {
      simpleGit.revparse.mockRejectedValue(new Error('Not a git repository'));
      await plugin.checkStackTag();
      expect(log.error).toHaveBeenCalledWith('Could not get git commit details - deployment will continue');
    });

    it('should deploy if dirty', async () => {
      simpleGit.revparse.mockResolvedValue('abc123');
      simpleGit.diffSummary.mockResolvedValue({ changed: 1, insertions: 0, deletions: 0 });
      AWS.request.mockResolvedValue({
        Stacks: [
          {
            Tags: [{ Key: 'GIT_VERSION_COMMIT', Value: 'abc123' }],
          },
        ],
      });
      await plugin.checkStackTag();
      expect(log.info).toHaveBeenCalledWith('Working directory is dirty - deployment will continue');
    });
  });
});
