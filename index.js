"use strict";

// eslint-disable-next-line node/no-unpublished-require
const lookupCommand = require("ember-cli/lib/cli/lookup-command");
// eslint-disable-next-line node/no-unpublished-require
const serveURL = require("ember-cli/lib/utilities/get-serve-url");
const UI_PATCH_ID = "PATCH_9cf61e15-5685-4308-8938-e5c991825bc6";
const path = require("path");
const fs = require("fs");
const express = require("express");
const fetch = require("node-fetch");
async function executeCommand(cli, commandName, commandArgs) {
  try {
    const command = makeCommand(cli, commandName, commandArgs);
    await runCommand(command, commandArgs);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
}
async function runCommand(command, commandArgs) {
  try {
    await command.beforeRun(commandArgs);
    await command.validateAndRun(commandArgs);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
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
let capturing = false;
let results = [];

const methodsToPatch = [
  // 'write',
  "writeError",
  // 'prependLine',
  "writeDeprecateLine",
  "writeLine",
  "writeErrorLine",
  "writeDebugLine",
  "writeInfoLine",
  "writeWarnLine"
];

function postData(url = "/", data = {}) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8"
    },
    body: JSON.stringify({ data })
  }).then(response => response.json());
}

module.exports = {
  name: require("./package").name,
  // ember-language-server inegraion
  onInit(_, project) {
    // eslint-disable-next-line no-unused-vars
    project.executors["els.executeInEmberCLI"] = async (server, __, [cmd]) => {
      try {
        let cliMetaFileName = path.join(__dirname, "meta.json");
        if (!fs.existsSync(cliMetaFileName)) {
          server.connection.window.showErrorMessage(
            "Unable to find server params, try start ember server inside project directory"
          );
          return;
        }
        let meta = JSON.parse(fs.readFileSync(cliMetaFileName, "utf8"));
        if (meta && meta.endpoint) {
          let results = await postData(
            meta.endpoint,
            (cmd || "")
              .replace("ember ", "")
              .trim()
              .split(" ")
              .map(e => e.trim())
              .filter(e => e.length)
          );
          if (results.length) {
            server.connection.window.showInformationMessage(results[0]);
          }
        }
      } catch (e) {
        server.connection.window.showErrorMessage(JSON.stringify(e));
      }
    };
  },
  serverMiddleware(config) {
    if (config.options.proxy) {
      this.ui.writeInfoLine('ember-fast-cli disabled, because --proxy option enabled!');
      return;
    }
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
      capturing = true;
      const [command, ...commandArgs] = req.body.data;
      executeCommand(this.parent.cli, command, commandArgs).then(() => {
        if (results.length === 0) {
          results.push(
            "No output, likely the specified command " +
              command +
              " is invalid. For available options, see `ember help`."
          );
        }
        res.json(results);
        results = [];
        capturing = false;
      });
    });

    let endpoint = `${serveURL(config.options, config.options.project)}cli`;

    fs.writeFileSync(
      path.join(__dirname, "meta.json"),
      JSON.stringify({ endpoint }),
      "utf8"
    );
    this.ui.writeLine("");
    this.ui.writeLine(`[ember-fast-cli] Serving on: ${endpoint}`);
    this.ui.writeLine("");

    if (UI_PATCH_ID in this.ui) {
      return;
    }
    methodsToPatch.forEach(methodName => {
      let originalImplementation = this.ui[methodName];
      this.ui[methodName] = (...args) => {
        if (capturing) {
          results.push(args[0]);
        }
        originalImplementation.apply(this.ui, args);
      };
    });
    this.ui[UI_PATCH_ID] = true;
  },

  isEnabled() {
    return true;
  }
};
