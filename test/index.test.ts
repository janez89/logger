import { test } from 'node:test';
import logger, { getLogger } from '../src/index.js';
import assert from 'node:assert';

test('logging scenarios', () => {
    const cap = captureStdoutStderr();
    try {
        const logger = getLogger('namespaced-logger');

        logger.debug('debug');
        logger.info('info', { foo: 'bar' });
        logger.warn('warn', 'with', 'multiple', 'args');
        logger.error('error', new Error('Oops!'));

        logger.log('INVALID-LOG-LEVEL' as any, 'something');

        assert.match(cap.stdout, /DEBUG .* --- namespaced-logger: debug\n/);
        assert.match(cap.stdout, /INFO .* --- namespaced-logger: info {"foo":"bar"}\n/);

        assert.match(cap.stderr, /WARN .* namespaced-logger: warn with multiple args\n/);
        assert.match(cap.stderr, /ERROR .* namespaced-logger: error Error: Oops!\n/);
        assert.match(cap.stderr, /WARN .* namespaced-logger: Invalid log level: INVALID-LOG-LEVEL. The line was not logged.\n/);
    } finally {
        cap.restore();
    }
});

test('root logger', () => {
    const cap = captureStdoutStderr();
    try {
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error', new Error('Oops!'));

        logger.log('INVALID-LOG-LEVEL' as any, 'something');

        assert.match(cap.stdout, /DEBUG .* --- app: debug\n/);
        assert.match(cap.stdout, /INFO .* --- app: info\n/);

        assert.match(cap.stderr, /WARN .* app: warn\n/);
        assert.match(cap.stderr, /ERROR .* app: error Error: Oops!\n/);
        assert.match(cap.stderr, /WARN .* app: Invalid log level: INVALID-LOG-LEVEL. The line was not logged.\n/);
    } finally {
        cap.restore();
    }
});

test('decreased verbosity', () => {
    const cap = captureStdoutStderr();
    try {
        const logger = getLogger('test', 'WARN');
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error', new Error('Oops!'));

        logger.log('INVALID-LOG-LEVEL' as any, 'something');

        assert.equal(cap.stdout, '');

        assert.match(cap.stderr, /WARN .* test: warn\n/);
        assert.match(cap.stderr, /ERROR .* test: error Error: Oops!\n/);
        assert.match(cap.stderr, /WARN .* test: Invalid log level: INVALID-LOG-LEVEL. The line was not logged.\n/);
    } finally {
        cap.restore();
    }
});

function captureStdoutStderr() {
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    let out = '';
    let err = '';

    process.stdout.write = (chunk: any, encoding?: any, cb?: any) => {
        out += Buffer.isBuffer(chunk) ? chunk.toString(encoding) : String(chunk);
        if (typeof cb === 'function') cb();
        return true;
    };
    process.stderr.write = (chunk: any, encoding?: any, cb?: any) => {
        err += Buffer.isBuffer(chunk) ? chunk.toString(encoding) : String(chunk);
        if (typeof cb === 'function') cb();
        return true;
    };

    return {
        get stdout() { return out; },
        get stderr() { return err; },
        restore() {
            process.stdout.write = originalStdoutWrite;
            process.stderr.write = originalStderrWrite;
        },
    };
}
