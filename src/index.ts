/* eslint-disable no-console */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    log: (level: LogLevel, ...args: unknown[]) => void;
    level: LogLevel;
    name: string;
}

type LevelWeight = Record<LogLevel, number>;

const GLOBAL_LEVEL: LogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || 'DEBUG';
const ROOT_LOGGER_NAME = process.env.ROOT_LOGGER_NAME || 'app';

const LEVEL_WEIGHT: LevelWeight = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
};

enum Color {
    reset = '\x1b[0m',
    gray = '\x1b[90m',
    red = '\x1b[31m',
    green = '\x1b[32m',
    yellow = '\x1b[33m',
    blue = '\x1b[34m',
    magenta = '\x1b[35m',
    cyan = '\x1b[36m'
};

const useColor = process.stdout.isTTY && process.stderr.isTTY && process.env.NO_COLOR !== "1";
const LevelColor = {
    ERROR: Color.red,
    WARN: Color.yellow,
    INFO: Color.green,
    DEBUG: Color.blue
};

function colorize(color: Color, str: string | number) {
    return useColor ? `${color}${str}${Color.reset}` : str;
}

function pad(num: number, size: number) {
    const s = String(num);
    return s.length >= size ? s : '0'.repeat(size - s.length) + s;
}

function formatTimestamp(d = new Date()): string {
    // [YYYY-MM-DD HH:mm:ss.mmm]
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1, 2);
    const day = pad(d.getDate(), 2);
    const hours = pad(d.getHours(), 2);
    const minutes = pad(d.getMinutes(), 2);
    const seconds = pad(d.getSeconds(), 2);
    const millis = pad(d.getMilliseconds(), 3);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
}

function shouldLog(current: LogLevel, globalLevel: LogLevel): boolean {
    return LEVEL_WEIGHT[current] >= LEVEL_WEIGHT[globalLevel];
}

function serialize(args: unknown[]): string {
    return args
        .map((a) => {
            if (a instanceof Error) {
                // Include stack if present
                return a.stack || `${a.name}: ${a.message}`;
            }
            if (typeof a === 'object') {
                try {
                    return JSON.stringify(a);
                } catch {
                    return String(a);
                }
            }
            return String(a);
        })
        .join(' ');
}

function baseLog(level: LogLevel, name: string, ...args: unknown[]) {
    if (!shouldLog(level, GLOBAL_LEVEL)) {
        return;
    }
    const ts = colorize(Color.gray, formatTimestamp());
    const prefix = `${ts} ${colorize(LevelColor[level], level.padStart(5))} ${colorize(Color.magenta, process.pid)} --- ${colorize(Color.cyan, name)}:`;
    const line = `${prefix} ${serialize(args)}`;

    if (level === 'ERROR' || level === 'WARN') {
        process.stderr.write(line + '\n');
    } else {
        process.stdout.write(line + '\n');
    }
}

const loggers = new Map<string, Logger>();

export function getLogger(name: string): Logger {
    if (loggers.has(name)) {
        return loggers.get(name)!;
    }

    const logger: Logger = Object.freeze({
        name,
        level: GLOBAL_LEVEL,
        log: (logLevel: LogLevel, ...args: unknown[]) => LEVEL_WEIGHT[logLevel] === undefined
            ? logger.warn(`Invalid log level: ${logLevel}. The line was not logged.`)
            : baseLog(logLevel, name, ...args),
        debug: (...args: unknown[]) => baseLog('DEBUG', name, ...args),
        info: (...args: unknown[]) => baseLog('INFO', name, ...args),
        warn: (...args: unknown[]) => baseLog('WARN', name, ...args),
        error: (...args: unknown[]) => baseLog('ERROR', name, ...args),
    });

    loggers.set(name, logger);
    return logger;
}

// Optional: convenience root logger
const logger = getLogger(ROOT_LOGGER_NAME);

logger.info(`Logger initialized. Global log level: ${GLOBAL_LEVEL}. Node version: ${process.version}`)
logger.debug(`Use LOG_LEVEL=INFO to decrease verbosity. Supported values: ${Object.keys(LEVEL_WEIGHT).join(', ')}`)

export default logger;
