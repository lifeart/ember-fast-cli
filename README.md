ember-fast-cli
==============================================================================

This addon allow execute cli commands on running `ember-cli` instance.

`ember-cli` commands execution relatively slow, because we need to "revalidate" all dependencies on each command execution (we have too boot full `cli` to execute any blueprint.

It may take up to `5-20s` to generate component using `ember g component foo-bar`.

But, if we will execute commands on already started cli (development server, running by `ember s`), we can get 500x boost on `cli` performance, for my case component generation time reduced from `5s` to `0.2s`.


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

After you have started your development server using `ember serve`, this addon adds a custom middleware listening to `/cli`. 
So just open [http://localhost:4200/cli](http://localhost:4200/cli) in your web browser to access `fast-cli`.

type: `ember g component foo-bar` + Enter

check files!

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
