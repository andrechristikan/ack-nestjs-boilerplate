import { registerAs } from '@nestjs/config';

export default registerAs(
    'file',
    (): Record<string, any> => ({
        fieldNameSize: 100, // in bytes
        fieldSize: 524288, // 500 KB
        maxFileSize: 104858, // 100 KB
        maxFiles: 2, // 1 files
    })
);
