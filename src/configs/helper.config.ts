import { registerAs } from '@nestjs/config';

export default registerAs(
    'helper',
    (): Record<string, any> => ({
        salt: {
            length: 8,
        },
    })
);
