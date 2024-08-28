import { Repl } from './api/exporter';
import extract from 'extract-zip';

import { join } from 'node:path';
import { createWriteStream, existsSync, WriteStream } from 'node:fs';
import { readFile, unlink, writeFile, rm } from 'node:fs/promises';
import { Glob } from 'glob';

// Post processing for extracting zip files from repls
export class ReplZip {
    public repl: Repl;
    private paths: { zip: string; folder: string };
    private filter: Array<string>;

    constructor(repl: Repl, source: string, filter: Array<string>) {
        this.repl = repl;
        this.filter = filter || [];
        this.paths = {
            zip: join(source, `${repl.id}.zip`),
            folder: join(source, `${repl.slug}/`),
        };
    }

    public getZipWriteStream(): WriteStream {
        const path = this.paths.zip;
        return createWriteStream(path);
    }

    public async process() {
        await this.unzip();

        // Create a file with repl data
        const metadata = join(this.paths.folder, 'repl.metadata.json');
        if (!existsSync(metadata)) {
            await writeFile(metadata, JSON.stringify(this.repl, null, 4));
        }

        // Parse environment variables from cache folder
        // and sort them into one file
        const replitEnvPath = join(this.paths.folder, '.cache/replit/env/latest.json');
        if (existsSync(replitEnvPath)) {
            const data = (await readFile(replitEnvPath)).toString();
            const envData = JSON.parse(data).environment;

            const env = Object.keys(envData)
                .filter((e) => !REPLIT_SYSTEM_ENV.includes(e))
                .map((n) => `${n}=${envData[n]}`)
                .join('\r\n');
            const envPath = join(this.paths.folder, '.env');
            if (!existsSync(envPath)) {
                await writeFile(envPath, env);
            }
        }

        console.log(`Extracted @${this.repl.user.username}/${this.repl.slug}`);
    }

    async unzip() {
        await extract(this.paths.zip, {
            dir: this.paths.folder,
            defaultDirMode: 0o755,
            defaultFileMode: 0o755,
        });

        await unlink(this.paths.zip);

        const filters = this.filter.map((f) => join(this.paths.folder, f));
        const filtered = new Glob(filters, { absolute: true });
        const iterator = filtered.iterate();

        while (true) {
            const { done, value } = await iterator.next();
            if (done) break;

            if (!value) continue;

            const file = value;
            await rm(file, { force: true, recursive: true });
        }
    }
}

// Default environment variables in all Repls to filter
export const REPLIT_SYSTEM_ENV = [
    'PATH',
    'REQUESTS_CA_BUNDLE',
    'SSL_CERT_FILE',
    'XDG_CACHE_HOME',
    'XDG_CONFIG_HOME',
    'XDG_DATA_HOME',
    '__EGL_VENDOR_LIBRARY_FILENAMES',
    'REPLIT_CLI',
    'REPLIT_BASHRC',
    'NODE_EXTRA_CA_CERTS',
    'NIX_PATH',
    'NIX_PROFILES',
    'NIXPKGS_ALLOW_UNFREE',
    'LIBGL_DRIVERS_PATH',
    'LOCALE_ARCHIVE',
];
