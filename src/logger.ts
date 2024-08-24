import chalk from 'chalk';

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...data) => {
    const timestamp = new Date().toISOString();
    return originalLog(timestamp, ...data);
};

console.error = (...data) => {
    const timestamp = new Date().toISOString();
    const c = chalk.redBright(timestamp, ...data);
    return originalError(c);
};

console.warn = (...data) => {
    const timestamp = new Date().toISOString();
    const c = chalk.yellowBright(timestamp, ...data);
    return originalWarn(c);
};

export const trace = (...data: any[]) => {
    if (!process.env['DEBUG']) return;

    const timestamp = new Date().toISOString();
    const c = chalk.bgCyanBright(timestamp, ...data);
    return console.log(c);
};
