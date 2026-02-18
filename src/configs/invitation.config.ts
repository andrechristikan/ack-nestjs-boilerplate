import { registerAs } from '@nestjs/config';

export interface IConfigInvitation {
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
    'invitation',
    (): IConfigInvitation => ({
        expiredInMinutes: 5,
        tokenLength: 100,
        linkBaseUrl: 'invitation',
        resendInMinutes: 2,
        reference: {
            prefix: 'INV',
            length: 25,
        },
    })
);
