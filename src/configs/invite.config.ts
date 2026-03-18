import { registerAs } from '@nestjs/config';
import { InviteConfig } from '@modules/invite/interfaces/invite.interface';
import {
    ProjectInviteType,
    TenantInviteType,
} from '@modules/invite/constants/invite-type.constant';

export interface IInviteContextConfig extends InviteConfig {}

export interface IConfigInvite {
    tenant: IInviteContextConfig;
    project: IInviteContextConfig;
}

export const InviteTypeConfigSectionMap = {
    [TenantInviteType]: 'tenant',
    [ProjectInviteType]: 'project',
} as const;

export default registerAs(
    'invite',
    (): IConfigInvite => ({
        tenant: {
            expiredInMinutes: 10080,
            tokenLength: 100,
            linkBaseUrl: 'tenants/invites',
            resendInMinutes: 2,
            reference: {
                prefix: 'TIN',
                length: 25,
            },
        },
        project: {
            expiredInMinutes: 10080,
            tokenLength: 100,
            linkBaseUrl: 'projects/invites',
            resendInMinutes: 2,
            reference: {
                prefix: 'PIN',
                length: 25,
            },
        },
    })
);
