import {
    TermPolicy,
    TermPolicyUserAcceptance,
    User,
} from '@generated/prisma-client';

export interface ITermPolicyUserAcceptance extends TermPolicyUserAcceptance {
    user: User;
    termPolicy: TermPolicy;
}
