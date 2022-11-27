import { registerAs } from '@nestjs/config';

export default registerAs(
    'debugger',
    (): Record<string, any> => ({
        http: {
            writeIntoFile:
                process.env.DEBUGGER_HTTP_WRITE_INTO_FILE === 'true' || false,
            writeIntoConsole:
                process.env.DEBUGGER_HTTP_WRITE_INTO_CONSOLE === 'true' ||
                false,
            maxFiles: 5,
            maxSize: '2M',
        },
        system: {
            writeIntoFile:
                process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE === 'true' || false,
            writeIntoConsole:
                process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE === 'true' ||
                false,
            maxFiles: '7d',
            maxSize: '2m',
        },
    })
);
