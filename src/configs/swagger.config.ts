import { registerAs } from '@nestjs/config';

export default registerAs(
    'swagger',
    (): Record<string, any> => ({
        version: process.env.SWAGGER_VERSION || '1.0',
        prefix: '/docs',
        licenseUrl:
            'https://github.com/andrechristikan/ack-nestjs-boilerplate-mongoose/blob/main/LICENSE.md',
    })
);
