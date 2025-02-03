import { registerAs } from '@nestjs/config';

export default registerAs(
    'doc',
    (): Record<string, any> => ({
        name: `${process.env.APP_NAME} APIs Specification`,
        description: 'Section for describe whole APIs',
        prefix: '/docs',
    })
);
