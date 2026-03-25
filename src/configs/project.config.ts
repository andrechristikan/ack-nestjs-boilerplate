import { registerAs } from '@nestjs/config';
import { InviteConfig } from '@modules/invite/interfaces/invite.interface';

export interface IConfigProject {
    invite: InviteConfig;
}

export default registerAs(
    'project',
    (): IConfigProject => ({
        invite: {
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
