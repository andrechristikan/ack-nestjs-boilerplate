import { registerAs } from '@nestjs/config';

export default registerAs(
    'country',
    (): Record<string, any> => ({
        assetPath: '/country-flags',
    })
);
