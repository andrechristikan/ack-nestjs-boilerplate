import { registerAs } from '@nestjs/config';

export default registerAs(
    'file',
    (): Record<string, any> => ({
        fieldNameSize: 100, // in bytes
        fieldSize: 1572864, // 1.5 MB
        maxFileSize: 1048576, // 1 MB
        maxFiles: 2, // 1 files
    })
);
