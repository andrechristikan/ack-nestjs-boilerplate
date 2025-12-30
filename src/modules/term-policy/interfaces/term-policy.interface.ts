import { TermPolicy, TermPolicyUserAcceptance, User } from '@prisma/client';

export interface ITermPolicyUserAcceptance extends TermPolicyUserAcceptance {
    user: User;
    termPolicy: TermPolicy;
}
