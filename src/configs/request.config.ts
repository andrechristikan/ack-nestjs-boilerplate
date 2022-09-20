import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export default registerAs(
    'request',
    (): Record<string, any> => ({
        json: {
            maxFileSize: bytes('100kb'), // 100kb
        },
        raw: {
            maxFileSize: bytes('10mb'), // 10mb
        },
        text: {
            maxFileSize: bytes('100kb'), // 100kb
        },
        urlencoded: {
            maxFileSize: bytes('100kb'), // 100kb
        },
    })
);
