import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export default registerAs(
    'file',
    (): Record<string, any> => ({
        image: {
            maxFileSize: bytes('100 KB'), // 100 KB
            maxFiles: 3, // 3 files
        },
        excel: {
            maxFileSize: bytes('5mb'), // 5mb
            maxFiles: 1, // 1 files
        },
        audio: {
            maxFileSize: bytes('10mb'), // 10mb
            maxFiles: 1, // 1 files
        },
        video: {
            maxFileSize: bytes('25mb'), // 25mb
            maxFiles: 1, // 1 files
        },
    })
);
