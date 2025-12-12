import { TermPolicy, TermPolicyUserAcceptance, User } from '@prisma/client';

export interface ITermPolicyUserAcceptance extends TermPolicyUserAcceptance {
    user: User;
    termPolicy: TermPolicy;
}

export interface ITermPolicyImportResult {
    key: string;
    size: number;
}
