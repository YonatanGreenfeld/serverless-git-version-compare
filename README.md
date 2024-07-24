# serverless-git-version-compare

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm](https://img.shields.io/npm/v/serverless-git-version-compare.svg)](https://www.npmjs.com/package/serverless-git-version-compare)
![Secured by: Jit](https://img.shields.io/badge/Secured%20by-Jit-B8287F?style=?style=plastic)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Description

`serverless-git-version-compare` is a plugin for the Serverless Framework that compares the local and deployed AWS
serverless stack versions. It helps ensure that the same version is not deployed multiple times, preventing unnecessary
deployments.


## How it works
Upon running `sls deploy`, the plugin will automatically compare the local and deployed versions by using the HEAD commit hash and comparing it to the stack tag.
If the versions are the same, the deployment will be skipped. Otherwise, the stack tag will be updated with the new commit.
The tag is added to every resource deployed as part of the stack.

For local deployments, if the working directory is not clean, the deployment will continue regardless of the version comparison.
To change this default behavior, see the configuration section below.

## Installation

To install the plugin, add it to your project using npm:

```bash
npm install serverless-git-version-compare --save-dev
```
Then, add the plugin to your serverless.yml file:
```yaml
plugins:
  - serverless-git-version-compare
```

## Configuration
You can configure the plugin in your serverless.yml file under the custom section:
```yaml
custom:
  gitVersionCompare:
    enabled: true
    alwaysDeployDirty: true
```
- `enabled` (default: `true`): Enables or disables the plugin.
- `alwaysDeployDirty` (default: `true`): Whether to ignore version comparison if the working directory is not clean.

## CLI Options
The plugin provides an optional CLI option:
```bash
--force: Forces the deployment to continue regardless of the commit hash.
```

## Plugin Commands
The plugin provides a command to fetch the current deployed version:
```text
sls get-deployed-commit
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
