#!/usr/bin/env node
process.env['NODE_NO_WARNINGS'] = '1';
import chalk from 'chalk';
import { program } from 'commander';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Exporter } from './api/exporter';
import { ReplZip } from './repl';

program
    .version(require('../package.json').version)
    .requiredOption('-o, --output <directory>', 'Directory to save Repls to')
    .requiredOption('-a, --auth <cookie>', 'Replit authorization cookie (connect.sid)')
    .option('-l, --load <file>', 'Exporter savefile to continue from', '.replit-export.save')
    .option('-c, --concurrent <number>', 'Maximum concurrent download', '15')
    .option('-m, --max', 'Maximum amount of Repls to download')
    .option('-f, --filter <...files>', 'Filter files that match the expressions', [
        'node_modules/',
        '.cargo/',
        '.cache/typescript/',
    ])
    .action(async (args) => {
        const output = resolve(args.output);
        const concurrent = parseInt(args.concurrent);
        const saveFile = resolve(args.load);
        const max = args.max ? parseInt(args.max) : undefined;
        let filter = args.filter;
        const auth = args.auth;

        if (isNaN(concurrent)) throw new Error(`Not a Number: ${args.concurrent} (concurrent)`);
        if (max && isNaN(max)) throw new Error(`Not a Number: ${args.max} (max)`);
        if (typeof filter == 'string') filter = filter.split(',');

        await run(output, concurrent, saveFile, auth, filter, max);
    });

program.parse(process.argv);

process.on('unhandledRejection', (error) => {
    console.error(error);
    console.warn('Unknown error occured, simply restart the CLI to resume download');
});

process.on('uncaughtException', (error) => {
    console.error(error);
    console.warn('Unknown error occured, simply restart the CLI to resume download');
});

async function run(
    output: string,
    concurrent: number,
    saveFile: string,
    auth: string,
    filteredFiles: Array<string>,
    maxRepls?: number,
) {
    let state = null;
    if (existsSync(saveFile)) {
        const save = (await readFile(saveFile)).toString();
        try {
            state = JSON.parse(save);
            console.log('Resuming state', state);
        } catch {}
    }

    if (!existsSync(output)) mkdirSync(output);

    const exporter = new Exporter({ rest: { authorization: auth }, state: state });
    let count = 0;

    if (state) {
        const userId = await exporter.getUser();
        if (userId != state.user) {
            console.warn(`Ignoring savefile, user mismatch (${state.user} != ${userId})`);
            exporter.state = { user: userId };
        } else {
            exporter.state.user = userId;
        }
    }

    while (true) {
        if (maxRepls && concurrent + count > maxRepls) {
            concurrent = maxRepls - count;
        } else if (maxRepls && count >= maxRepls) {
            break;
        }

        const repls = await exporter.getNextRepls(concurrent);

        console.log(`Downloading ${repls.length} repls (${count} finished).`);
        count += repls.length;
        if (repls.length < 1) break;

        const zips = repls.map((r) => new ReplZip(r, output, filteredFiles));
        await exporter.bulkDownloadRepls(
            repls,
            zips.map((z) => z.getZipWriteStream()),
        );
        await Promise.all(zips.map((z) => z.process()));
        await save(exporter, saveFile);
    }

    console.log(chalk.green(`Downloaded ${count} repls`));
}

async function save(exporter: Exporter, saveFile: string) {
    const state = JSON.stringify(exporter.state);
    await writeFile(saveFile, state);
}
