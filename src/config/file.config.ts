import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export default registerAs(
    'file',
    (): Record<string, any> => ({
        fieldNameSize: bytes(100), // in bytes
        fieldSize: bytes('500kb'), // 500 KB
        maxFileSize: bytes('100kb'), // 100 KB
        maxFiles: 2, // 2 files
    })
);
