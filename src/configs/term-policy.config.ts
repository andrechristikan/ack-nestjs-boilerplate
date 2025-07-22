import { registerAs } from '@nestjs/config';

export default registerAs(
    'termPolicy',
    (): Record<string, any> => ({
        uploadPath: '/term-policies',
    })
);
