import { registerAs } from '@nestjs/config';

export interface ITenantConfig {
    invite: {
        expiresInDays: number;
    };
}

export default registerAs(
    'tenant',
    (): ITenantConfig => ({
        invite: {
            expiresInDays: 7,
        },
    })
);
