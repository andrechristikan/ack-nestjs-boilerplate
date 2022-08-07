import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export default registerAs(
    'file',
    (): Record<string, any> => ({
        default: {
            maxFileSize: bytes('10kb'), // 10 KB
            maxFiles: 3, // 3 files
        },
        image: {
            maxFileSize: bytes('100 KB'), // 100 KB
            maxFiles: 2, // 3 files
        },
        excel: {
            maxFileSize: bytes('2mb'), // 2mb
            maxFiles: 1, // 1 files
        },
        audio: {
            maxFileSize: bytes('10mb'), // 10mb
            maxFiles: 1, // 1 files
        },
        video: {
            maxFileSize: bytes('100mb'), // 100mb
            maxFiles: 1, // 1 files
        },
    })
);
