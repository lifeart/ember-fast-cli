'use strict';
let cli = null;



// node_modules\ember-cli\lib\cli\index.js
// cli.env = environment;

const lookupCommand = require('ember-cli/lib/cli/lookup-command');

async function executeCommand(cli, commandName, commandArgs) {
  let t = Date.now();
  const command = makeCommand(cli, commandName, commandArgs);
  await runCommand(command, commandArgs);
  console.log('done: ' + '" '+[commandName, ...commandArgs].join(' ')+' "' + ' in ' + ((Date.now() - t)/1000) + 's');
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

function startServer() {
  var express = require('express');
  var app = express();
  
  app.get('/', function (req, res) {
    const [command, ...commandArgs] = req.query.c.replace(/"/gi,'').replace('ember ','').trim().split(' ').map(e=>e.trim()).filter(e=>e.length);
    executeCommand(cli, command, commandArgs).then(()=>{
      res.send([command, ...commandArgs].join(' '));
    })
  });
  
  app.listen(4400, function () {
    console.log('Example app listening on port 3000!');
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
