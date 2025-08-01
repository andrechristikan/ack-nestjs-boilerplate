import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';

export interface ITermPolicyTemplateService {
    getUploadPath(): string;
    createDocumentFilename(mime: string): string;
    createDocumentFilenameForMigration(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        language: string,
        mime: string,
        version?: number
    ): string;
}
