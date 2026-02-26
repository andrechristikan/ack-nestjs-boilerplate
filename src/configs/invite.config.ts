import { registerAs } from '@nestjs/config';

export interface IConfigInvite {
    expiredInMinutes: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMinutes: number;
    reference: {
        prefix: string;
        length: number;
    };
}

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
