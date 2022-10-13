import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export default registerAs(
    'request',
    (): Record<string, any> => ({
        json: {
            maxFileSize: bytes('100kb'), // 100kb
        },
        raw: {
            maxFileSize: bytes('5mb'), // 5mb
        },
        text: {
            maxFileSize: bytes('100kb'), // 100kb
        },
        urlencoded: {
            maxFileSize: bytes('100kb'), // 100kb
        },
    })
);
