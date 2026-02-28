import { registerAs } from '@nestjs/config';
import { InviteConfig } from '@modules/invite/interfaces/invite.interface';

export type IConfigInvite = InviteConfig;

export default registerAs(
    'invite',
    (): IConfigInvite => ({
        expiredInMinutes: 5,
        tokenLength: 100,
        linkBaseUrl: 'invite',
        resendInMinutes: 2,
        reference: {
            prefix: 'INV',
            length: 25,
        },
    })
);
