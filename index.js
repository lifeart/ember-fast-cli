"use strict";

// eslint-disable-next-line node/no-unpublished-require
const lookupCommand = require("ember-cli/lib/cli/lookup-command");

function getServeURL(options) {
  return `http${options.ssl ? "s" : ""}://${options.host || "localhost"}:${
    options.port
  }/cli`;
}

const UI_PATCH_ID = "PATCH_9cf61e15-5685-4308-8938-e5c991825bc6";
const path = require("path");
const fs = require("fs");
const express = require("express");
const fetch = require("node-fetch");
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

let capturing = false;
let results = [];
async function executeCommand(cli, commandName, commandArgs) {
  capturing = true;
  try {
    const command = makeCommand(cli, commandName, commandArgs);
    await runCommand(command, commandArgs);
    capturing = false;
  } catch (e) {
    results.push(e.toString());
    capturing = false;
  }
}
async function runCommand(command, commandArgs) {
  await command.beforeRun(commandArgs);
  await command.validateAndRun(commandArgs);
}
function maybeWarnEmberCliError(cli) {
  if (!("env" in cli)) {
    cli.ui.writeWarnLine(
      `ember-fast-cli: unable to connect to ember-cli (no environment), check addon readme.`
    );
    return true;
  } else {
    return false;
  }
}
function makeCommand(cli, commandName, commandArgs) {
  if ("maybeMakeCommand" in cli) {
    return cli.maybeMakeCommand(commandName, commandArgs);
  }
  if (maybeWarnEmberCliError(cli)) {
    return;
  }
  let CurrentCommand = lookupCommand(
    cli.env.commands,
    commandName,
    commandArgs,
    {
      project: cli.env.project,
      ui: cli.ui,
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
    cli: cli,
  });
  return command;
}

const xtermPath = path.dirname(path.dirname(require.resolve("xterm")));

const methodsToPatch = [
  // 'write',
  "writeError",
  // 'prependLine',
  "writeDeprecateLine",
  "writeLine",
  "writeErrorLine",
  "writeDebugLine",
  "writeInfoLine",
  "writeWarnLine",
];

function postData(url = "/", data = {}) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({ data }),
    agent: httpsAgent
  }).then((response) => response.json());
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
              .map((e) => e.trim())
              .filter((e) => e.length)
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
    if (!("maybeMakeCommand" in this.parent.cli)) {
      if (maybeWarnEmberCliError(this.parent.cli)) {
        return;
      }
    }

    let app = config.app;
    app.get("/cli", (_, res) => {
      res.sendFile(path.join(__dirname, "lib", "index.html"));
    });
    app.get("/cli/xterm.js", (_, res) => {
      res.sendFile(path.join(xtermPath, "lib", "xterm.js"));
    });
    app.get("/cli/xterm.css", (_, res) => {
      res.sendFile(path.join(xtermPath, "css", "xterm.css"));
    });
    app.use("/cli",  express.json());
    app.post("/cli", (req, res) => {
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
      });
    });

    let endpoint = getServeURL(config.options);

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
    /* eslint-disable no-console */
    const originalLog = console.log;
    console.log = (...args) => {
      if (capturing) {
        results.push(args[0]);
      }
      originalLog.apply(console, args);
    };
    methodsToPatch.forEach((methodName) => {
      let originalImplementation = this.ui[methodName];
      this.ui[methodName] = (...args) => {
        if (capturing) {
          results.push(args[0]);
        }
        originalImplementation.apply(this.ui, args);
      };
    });
    const originalPrompt = this.ui.prompt;
    this.ui.prompt = (...args) => {
      if (capturing) {
        results.push(args[0].message);
        const choices = args[0].choices || [];
        const maybeSkipAnswer = choices.find(({ value }) => value === "skip");
        if (maybeSkipAnswer) {
          results.push("Answer: " + maybeSkipAnswer.name);
          return Promise.resolve({ answer: maybeSkipAnswer.value });
        }
        const maybeNoAnswer = choices.find(
          ({ key }) => key.toLowerCase() === "n"
        );
        if (maybeNoAnswer) {
          results.push("Answer: " + maybeSkipAnswer.name);
          return Promise.resolve({ answer: maybeSkipAnswer.value });
        }
        return Promise.reject("Ember Fast CLi: Unable to answer.");
      }
      return originalPrompt.apply(this.ui, args);
    };
    this.ui[UI_PATCH_ID] = true;
  },
  isEnabled() {
    return true;
  },
};
