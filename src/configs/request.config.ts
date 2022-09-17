import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export default registerAs(
    'request',
    (): Record<string, any> => ({
        json: {
            maxFileSize: bytes('1mb'), // 1mb
        },
        raw: {
            maxFileSize: bytes('1mb'), // 1mb
        },
        text: {
            maxFileSize: bytes('1mb'), // 1mb
        },
        urlencoded: {
            maxFileSize: bytes('1mb'), // 1mb
        },
    })
);
