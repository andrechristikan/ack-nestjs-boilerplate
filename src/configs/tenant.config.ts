import { registerAs } from '@nestjs/config';
import { InviteConfig } from '@modules/invite/interfaces/invite.interface';

export interface IConfigTenant {
    headerName: string;
    invite: InviteConfig;
}

export default registerAs(
    'tenant',
    (): IConfigTenant => ({
        headerName: 'x-tenant-id',
        invite: {
            expiredInMinutes: 10080,
            tokenLength: 100,
            linkBaseUrl: 'tenants/invites',
            resendInMinutes: 2,
            reference: {
                prefix: 'TIN',
                length: 25,
            },
        },
    })
);
