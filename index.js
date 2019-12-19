"use strict";

// eslint-disable-next-line node/no-unpublished-require
const lookupCommand = require("ember-cli/lib/cli/lookup-command");
// eslint-disable-next-line node/no-unpublished-require
const serveURL = require('ember-cli/lib/utilities/get-serve-url');

const path = require("path");
const express = require("express");
async function executeCommand(cli, commandName, commandArgs) {
  try {
    const command = makeCommand(cli, commandName, commandArgs);
    await runCommand(command, commandArgs);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e, e);
  }
}
async function runCommand(command, commandArgs) {
  try {
    await command.beforeRun(commandArgs);
    await command.validateAndRun(commandArgs);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("e", e);
  }
}
function makeCommand(cli, commandName, commandArgs) {
  let CurrentCommand = lookupCommand(
    cli.env.commands,
    commandName,
    commandArgs,
    {
      project: cli.env.project,
      ui: cli.ui
    }
  );

  let command = new CurrentCommand({
    ui: cli.ui,
    analytics: cli.analytics,
    commands: cli.env.commands,
    tasks: cli.env.tasks,
    project: cli.env.project,
    settings: cli.env.settings,
    testing: cli.testing,
    cli: cli
  });

  return command;
}

const xtermPath = path.dirname(path.dirname(require.resolve("xterm")));

module.exports = {
  name: require("./package").name,
  serverMiddleware(config) {
    let app = config.app;
    app.use(express.json());
    app.get("/cli", (_, res) => {
      res.sendFile(path.join(__dirname, "lib", "index.html"));
    });
    app.get("/cli/xterm.js", (_, res) => {
      res.sendFile(path.join(xtermPath, "lib", "xterm.js"));
    });
    app.get("/cli/xterm.css", (_, res) => {
      res.sendFile(path.join(xtermPath, "css", "xterm.css"));
    });

    app.post("/cli", (req, res) => {
      const [command, ...commandArgs] = req.body.data;
      executeCommand(this.parent.cli, command, commandArgs).then(() => {
        res.json([command, ...commandArgs]);
      });
    });

    this.ui.writeLine('');
    this.ui.writeLine(`[ember-fast-cli] Serving on: ${serveURL(config.options, config.options.project)}cli`);
    this.ui.writeLine('');
  },

  isEnabled() {
    return true;
  }
};
