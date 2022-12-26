import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

// if we use was api gateway, there has limitation of the payload size
// the payload size 10mb
export default registerAs(
    'file',
    (): Record<string, any> => ({
        image: {
            maxFileSize: bytes('1mb'), // 1mb
            maxFiles: 3, // 3 files
        },
        excel: {
            maxFileSize: bytes('5.5mb'), // 5.5mb
            maxFiles: 1, // 1 files
        },
        audio: {
            maxFileSize: bytes('5.5mb'), // 5.5mb
            maxFiles: 1, // 1 files
        },
        video: {
            maxFileSize: bytes('5.5mb'), // 5.5mb
            maxFiles: 1, // 1 files
        },
    })
);
