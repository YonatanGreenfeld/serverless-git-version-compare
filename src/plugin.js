const simpleGit = require('simple-git'),
  git = simpleGit(),
  GIT_COMMIT_TAG_KEY = 'GIT_VERSION_COMMIT',
  customPropertiesSchema = {
    properties: {
      gitVersionCompare: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
          },
          alwaysDeployDirty: {
            type: 'boolean',
            default: true,
          },
        },
      },
    },
  };

class GitVersionComparePlugin {
  static tags = ['build'];

  constructor(serverless, options, { log }) {
    this.serverless = serverless;
    this.log = log;
    this.provider = this.serverless.getProvider('aws');
    this.options = options;

    this.config = {
      enabled: this.serverless.service.custom.gitVersionCompare?.enabled ?? true,
      alwaysDeployDirty: this.serverless.service.custom.gitVersionCompare?.alwaysDeployDirty ?? true,
    };

    serverless.configSchemaHandler.defineCustomProperties(customPropertiesSchema);

    this.hooks = {
      'package:initialize': () => this.checkStackTag(),
      'get-deployed-commit:run': () => this.logDeployedCommitCommand(),
    };

    this.commands = {
      'get-deployed-commit': {
        lifecycleEvents: ['run'],
      },
    };
  }

  /**
   * Check if the current commit is the same as the last deployed commit.
   * If it is, the deployment will be skipped.
   * If it is not, a tag with the current commit will be added to the stack tags and the deployment will continue.
   */
  async checkStackTag() {
    if (!this.config.enabled) {
      this.log.info('Git version compare is disabled - skipping check');
      return;
    }
    if (this.options.force) {
      this.log.notice('Force flag detected - deployment will continue regardless of commit hash');
      return;
    }
    const gitResult = await this.getGitHead();
    if (!gitResult) {
      this.log.error('Could not get git commit details - deployment will continue');
      return;
    }
    const [headCommit, isDirty] = gitResult;
    if (isDirty && this.config.alwaysDeployDirty) {
      this.log.info('Working directory is dirty - deployment will continue');
      return;
    }
    const currentCommit = await this.getDeployedCommit();
    if (headCommit) {
      this.serverless.addServiceOutputSection('Git Deployed Commit', headCommit);
      if (headCommit === currentCommit) {
        this.log.success('Deployed commit is the same as HEAD commit - skipping deployment');
        process.exit(0);
        return; // For tests
      }
    }
    this.addTagToStack(headCommit);
  }

  /**
   * Get the commit hash of the last deployed commit from the stack tags and log it.
   */
  async logDeployedCommitCommand() {
    const currentCommit = await this.getDeployedCommit();
    this.log.success(`The last deployed commit is: ${currentCommit}`);
  }

  /**
   * Get the commit hash of the last deployed commit from the stack tags.
   * @returns {Promise<string|null>}
   */
  async getDeployedCommit() {
    const stackName = this.provider.naming.getStackName();
    return await this.getCurrentDeployedCommit(stackName);
  }

  /**
   * Add a tag with the current commit to the stack tags.
   *
   * @param headCommit {string} - The current commit hash.
   */
  addTagToStack(headCommit) {
    this.log.info(`Adding tag ${GIT_COMMIT_TAG_KEY} with value ${headCommit} to stack tags`);
    this.serverless.service.provider.stackTags = {
      ...this.serverless.service.provider.stackTags,
      [GIT_COMMIT_TAG_KEY]: headCommit,
    };
  }

  /**
   * Get the current commit hash and check if the working directory is dirty.
   *
   * @returns {Promise<[string, boolean]|null>} - The current commit hash and a boolean indicating if the working directory is dirty.
   */
  async getGitHead() {
    try {
      const headCommit = await git.revparse(['HEAD']),
        diff = await git.diffSummary(['HEAD']),
        isDirty = diff.changed + diff.insertions + diff.insertions > 0;
      return [headCommit, isDirty];
    } catch (error) {
      this.log.error(`Error getting HEAD commit: ${error}`);
      return null;
    }
  }

  /**
   * Get the commit hash of the last deployed commit from the stack tags.
   *
   * @param stackName {string} - The name of the stack to get the tags from.
   * @returns {Promise<string|null>} - The commit hash of the last deployed commit or undefined if the stack or tag is not found.
   */
  async getCurrentDeployedCommit(stackName) {
    const response = await this.provider.request('CloudFormation', 'describeStacks', { StackName: stackName }),
      stackFound = response.Stacks.length > 0;
    if (!stackFound) {
      this.log.notice(`Stack with name ${stackName} not found - it may be the first deployment.`);
      return null;
    }
    const stackTags = response.Stacks[0].Tags,
      gitCommitTag = stackTags.find((tag) => tag.Key === GIT_COMMIT_TAG_KEY);
    if (!gitCommitTag) {
      this.log.notice(`Tag with key ${GIT_COMMIT_TAG_KEY} not found in stack tags - it may be the first deployment.`);
      return null;
    }
    return gitCommitTag.Value;
  }
}

module.exports = GitVersionComparePlugin;
