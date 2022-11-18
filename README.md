oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g drop-drop-box
$ drop-drop-box COMMAND
running command...
$ drop-drop-box (--version)
drop-drop-box/0.0.0 darwin-x64 node-v19.1.0
$ drop-drop-box --help [COMMAND]
USAGE
  $ drop-drop-box COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`drop-drop-box hello PERSON`](#drop-drop-box-hello-person)
* [`drop-drop-box hello world`](#drop-drop-box-hello-world)
* [`drop-drop-box help [COMMAND]`](#drop-drop-box-help-command)
* [`drop-drop-box plugins`](#drop-drop-box-plugins)
* [`drop-drop-box plugins:install PLUGIN...`](#drop-drop-box-pluginsinstall-plugin)
* [`drop-drop-box plugins:inspect PLUGIN...`](#drop-drop-box-pluginsinspect-plugin)
* [`drop-drop-box plugins:install PLUGIN...`](#drop-drop-box-pluginsinstall-plugin-1)
* [`drop-drop-box plugins:link PLUGIN`](#drop-drop-box-pluginslink-plugin)
* [`drop-drop-box plugins:uninstall PLUGIN...`](#drop-drop-box-pluginsuninstall-plugin)
* [`drop-drop-box plugins:uninstall PLUGIN...`](#drop-drop-box-pluginsuninstall-plugin-1)
* [`drop-drop-box plugins:uninstall PLUGIN...`](#drop-drop-box-pluginsuninstall-plugin-2)
* [`drop-drop-box plugins update`](#drop-drop-box-plugins-update)

## `drop-drop-box hello PERSON`

Say hello

```
USAGE
  $ drop-drop-box hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/ndp/drop-drop-box/drop-drop-box/blob/v0.0.0/dist/commands/hello/index.ts)_

## `drop-drop-box hello world`

Say hello world

```
USAGE
  $ drop-drop-box hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ drop-drop-box hello world
  hello world! (./src/commands/hello/world.ts)
```

## `drop-drop-box help [COMMAND]`

Display help for drop-drop-box.

```
USAGE
  $ drop-drop-box help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for drop-drop-box.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.18/src/commands/help.ts)_

## `drop-drop-box plugins`

List installed plugins.

```
USAGE
  $ drop-drop-box plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ drop-drop-box plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.6/src/commands/plugins/index.ts)_

## `drop-drop-box plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ drop-drop-box plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ drop-drop-box plugins add

EXAMPLES
  $ drop-drop-box plugins:install myplugin 

  $ drop-drop-box plugins:install https://github.com/someuser/someplugin

  $ drop-drop-box plugins:install someuser/someplugin
```

## `drop-drop-box plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ drop-drop-box plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ drop-drop-box plugins:inspect myplugin
```

## `drop-drop-box plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ drop-drop-box plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ drop-drop-box plugins add

EXAMPLES
  $ drop-drop-box plugins:install myplugin 

  $ drop-drop-box plugins:install https://github.com/someuser/someplugin

  $ drop-drop-box plugins:install someuser/someplugin
```

## `drop-drop-box plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ drop-drop-box plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ drop-drop-box plugins:link myplugin
```

## `drop-drop-box plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ drop-drop-box plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ drop-drop-box plugins unlink
  $ drop-drop-box plugins remove
```

## `drop-drop-box plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ drop-drop-box plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ drop-drop-box plugins unlink
  $ drop-drop-box plugins remove
```

## `drop-drop-box plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ drop-drop-box plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ drop-drop-box plugins unlink
  $ drop-drop-box plugins remove
```

## `drop-drop-box plugins update`

Update installed plugins.

```
USAGE
  $ drop-drop-box plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
