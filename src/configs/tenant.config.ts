import { registerAs } from '@nestjs/config';
import { InviteConfig } from '@modules/invite/interfaces/invite.interface';
import { TenantHeaderId } from '@modules/tenant/constants/tenant.constant';

export interface IConfigTenant {
    header: string;
    invite: InviteConfig;
}

export default registerAs(
    'tenant',
    (): IConfigTenant => ({
        header: TenantHeaderId,
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
