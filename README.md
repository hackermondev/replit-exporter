# Replit Starter Plan Changes

Replit has recently updated its Starter Plan (the core free plan) to limit users to 3 Repls. Accounts exceeding this limit may face restrictions in the future. To help you transition smoothly, this CLI script downloads all Repls from your account, including environment variables and configuration data, allowing you to securely move your projects off Replit.

## Installation

To install the package globally, run:

```sh
npm install -g replit-export
```

## Usage

```sh
replit-export --help
```

### Command Options

- `-V, --version`  
  Outputs the version number.

- `-o, --output <directory>`  
  Specifies the directory to save Repls.

- `-a, --auth <cookie>`  
  Replit authorization cookie (`connect.sid`).

- `-l, --load <file>`  
  Load a previous save file to continue downloading (default: `.replit-export.save`).

- `-c, --concurrent <number>`  
  Sets the maximum number of concurrent downloads (default: `15`).

- `-m, --max`  
  Limits the maximum number of Repls to download.

- `-f, --filter <...files>`  
  Filters out files matching the specified patterns (default: `["node_modules/",".cargo/"]`).

- `-h, --help`  
  Displays help information.

### Obtaining the Auth Cookie

To retrieve the authorization cookie required for this script:

1. Log in to [Replit](https://replit.com).
2. Open DevTools in your browser.
3. Copy the `connect.sid` cookie.  
   Alternatively, you can use an extension like Cookie Editor.

### Quickstart Guide

To quickly start downloading all your Repls, run the following command:

```bash
replit-export --output repls/ --auth <cookie>
```

This will download all public and private Repls from your account to the `repls/` folder.

### Environment Variables

Environment variables are automatically extracted and saved in a `.env` file in the root folder of each Repl.

### Ratelimit and Disk Space Considerations

If you have a large number of Repls, ensure you have sufficient disk space on your computer. Replit enforces a rate limit for downloading entire Repl zips. The CLI handles these rate limits automatically, and you may notice occasional pauses. If you have many Repls, it's recommended to leave the CLI running in the background until the process is complete.
