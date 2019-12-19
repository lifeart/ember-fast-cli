ember-fast-cli
==============================================================================

This addon allow execute cli commands on running ember-cli.


Compatibility
------------------------------------------------------------------------------

* Ember.js v3.4 or above
* Ember CLI v2.13 or above
* Node.js v8 or above


Installation
------------------------------------------------------------------------------

```
ember install ember-fast-cli
```


Usage
------------------------------------------------------------------------------

install addon into your porject.

edit `node_modules/ember-cli/lib/cli/index.js`

```js
  let environment = {
    tasks: loadTasks(),
    cliArgs: options.cliArgs,
    commands: loadCommands(),
    project,
    settings: merge(defaultUpdateCheckerOptions, config.getAll()),
  };

  cli.env = environment; // <-- we need to add this line

  return cli.run(environment).finally(() => willInterruptProcess.release());
```

After you have started your development server using ember serve, this addon adds a custom middleware listening to `/cli`. So just open `http://localhost:4200/cli` in your web browser to access cli.

type: `ember g component foo-bar` + Enter


check files!

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
