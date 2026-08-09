import { TermPolicy, TermPolicyUserAcceptance } from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface ITermPolicyUserAcceptance extends TermPolicyUserAcceptance {
    user: IUserRef;
    termPolicy: TermPolicy;
}
