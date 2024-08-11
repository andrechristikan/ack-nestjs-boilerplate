import { registerAs } from '@nestjs/config';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

export default registerAs(
    'user',
    (): Record<string, any> => ({
        usernamePrefix: 'user',
        usernamePattern: /^[a-zA-Z0-9-_]+$/,
        uploadPath:
            process.env.APP_ENV === ENUM_APP_ENVIRONMENT.PRODUCTION
                ? '/user/{user}'
                : '/test/user/{user}',
    })
);
