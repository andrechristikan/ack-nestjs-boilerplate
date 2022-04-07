import { registerAs } from '@nestjs/config';

export default registerAs(
    'user',
    (): Record<string, any> => ({
        uploadPath:
            process.env.APP_ENV === 'production' ? '/user' : '/test/user',
    })
);
