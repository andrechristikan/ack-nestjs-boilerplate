import { ITermPolicyImportResult } from '@modules/term-policy/interfaces/term-policy.interface';

export interface ITermPolicyTemplateService {
    importTermsOfService(): Promise<ITermPolicyImportResult>;
    importPrivacy(): Promise<ITermPolicyImportResult>;
    importCookie(): Promise<ITermPolicyImportResult>;
    importMarketing(): Promise<ITermPolicyImportResult>;
}
