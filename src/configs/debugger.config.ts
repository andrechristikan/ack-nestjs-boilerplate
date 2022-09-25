import { registerAs } from '@nestjs/config';
import ms from 'ms';
export default registerAs(
    'debugger',
    (): Record<string, any> => ({
        http: {
            writeIntoFile:
                process.env.DEBUGGER_HTTP_WRITE_INTO_FILE === 'true' || false,
            maxFiles: 5,
            maxSize: '2M',
        },
        system: {
            writeIntoFile:
                process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE === 'true' || false,
            maxFiles: ms('7d'),
            maxSize: '2m',
        },
    })
);
