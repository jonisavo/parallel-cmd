# parallel-cmd
[![CI](https://github.com/jonisavo/parallel-cmd/actions/workflows/node.js.yml/badge.svg)](https://github.com/jonisavo/parallel-cmd/actions/workflows/node.js.yml) [![codecov](https://codecov.io/gh/jonisavo/parallel-cmd/branch/master/graph/badge.svg?token=DL6NANMIXJ)](https://codecov.io/gh/jonisavo/parallel-cmd)

Queue shell commands to run in parallel.

NOTE: WIP, documentation to be updated

## CLI

### Basic usage

```shell script
parallel-cmd "npm install -g concurrently" "node -v"
```

Output:
```
[1/2] Running command "npm install -g concurrently"
[2/2] Running command "node -v"
[2/2] v16.13.2
[2/2] Finished successfully
[1/2] changed 27 packages, and audited 29 packages in 12s
[1/2] found 0 vulnerabilities
[1/2] Finished successfully
```

## API

### Basic usage

```javascript
const { parallelCmd } = require("parallel-cmd");

const commands = [
  "npm install -g concurrently",
  "node -v"
]

parallelCmd(commands);
```

Output:
```
[1/2] Running command "npm install -g concurrently"
[2/2] Running command "node -v"
[2/2] v16.13.2
[2/2] Finished successfully
[1/2] changed 27 packages, and audited 29 packages in 12s
[1/2] found 0 vulnerabilities
[1/2] Finished successfully
```


### Complex usage

```javascript
const { parallelCmd } = require("parallel-cmd");

const commands = [
    "npm install -g concurrently",
    "npm install -g @angular/cli",
    "npm install -g pkg"
];

parallelCmd(commands, {
  maxProcessCount: 2,
  abortOnError: true,
  outputStderr: true,
  headerTransformer: (command, allCommands) => {
    let maxWidth = 0;
    allCommands
      .map((command) => command.args[command.args.length - 1].length)
      .forEach((width) => {
        if (width > maxWidth) {
          maxWidth = width;
        }
      });
    const package = command.args[command.args.length - 1];
    return `(${package})`.padEnd(maxWidth + 3, " ");
  },
});
```

Output:
```
(concurrently)  Running command "npm install -g concurrently"
(@angular/cli)  Running command "npm install -g @angular/cli"
(concurrently)  changed 27 packages, and audited 29 packages in 15s
(concurrently)  found 0 vulnerabilities
(concurrently)  Finished successfully
(pkg)           Running command "npm install -g pkg"
(@angular/cli)  changed 193 packages, and audited 195 packages in 20s
(@angular/cli)  found 0 vulnerabilities
(@angular/cli)  Finished successfully
(pkg)           added 155 packages, and audited 157 packages in 6s
(pkg)           found 0 vulnerabilities
(pkg)           Finished successfully
```
