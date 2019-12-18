'use strict';
let cli = null;



// node_modules\ember-cli\lib\cli\index.js
// cli.env = environment;

const lookupCommand = require('ember-cli/lib/cli/lookup-command');
const path = require('path');
async function executeCommand(cli, commandName, commandArgs) {
  try {
    const command = makeCommand(cli, commandName, commandArgs);
    await runCommand(command, commandArgs);
  } catch(e) {
    console.log(e, e);
  }
}
async function runCommand(command, commandArgs) {
  try {
    await command.beforeRun(commandArgs);
    await command.validateAndRun(commandArgs);
  } catch(e) {
    console.log('e', e);
  }

}
function makeCommand(cli, commandName, commandArgs) {
  let CurrentCommand = lookupCommand(cli.env.commands, commandName, commandArgs, {
    project: cli.env.project,
    ui: cli.ui,
  });

  /*
   * XXX Need to decide what to do here about showing errors. For
   * a non-CLI project the cache is local and probably should. For
   * a CLI project the cache is there, but not sure when we'll know
   * about all the errors, because there may be multiple projects.
   *   if (this.packageInfoCache.hasErrors()) {
   *     this.packageInfoCache.showErrors();
   *   }
   */

  let command = new CurrentCommand({
    ui: cli.ui,
    analytics: cli.analytics,
    commands: cli.env.commands,
    tasks: cli.env.tasks,
    project: cli.env.project,
    settings: cli.env.settings,
    testing: cli.testing,
    cli: cli,
  });

  return command;
}

const xtermPath = path.dirname(path.dirname(require.resolve('xterm')));
const port = 4400;
function startServer() {
  var express = require('express');
  var serveStatic = require('serve-static')

  var app = express();


  app.use(express.json());
  app.use(serveStatic(path.join(xtermPath, 'lib')));
  app.use(serveStatic(path.join(xtermPath, 'css')));
  app.use(serveStatic(path.join(__dirname, 'lib'), { 'index': ['index.html'] }));

  app.post('/', function (req, res) {
    const [command, ...commandArgs] = req.body.data;
    executeCommand(cli, command, commandArgs).then(()=>{
      res.json([command, ...commandArgs]);
    })
  });
  
  app.listen(port, function () {
    console.log(`Example app listening on port ${port}!`);
  });
}


module.exports = {
  name: require('./package').name,
  included() {
    if (cli) {
      return;
    }
    cli = this.parent.cli;
    startServer();
  }
};
