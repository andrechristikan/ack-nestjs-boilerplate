import { ENUM_VERIFICATION_TYPE } from '@prisma/client';

export interface IVerificationCreate {
    type: ENUM_VERIFICATION_TYPE;
    expiredAt: Date;
    expiredInMinutes: number;
    reference: string;
    token: string;
    link: string;
}
