import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    ITermPolicyContent,
    ITermPolicyContentPresign,
} from '@modules/term-policy/interfaces/term-policy.interface';

export interface ITermPolicyContentService {
    generateContentPresignByAdmin(
        data: ITermPolicyContentPresign
    ): Promise<IAwsS3Presign>;
    updateContentByAdmin(
        termPolicyId: string,
        content: ITermPolicyContent,
        updatedBy: string
    ): Promise<void>;
    addContentByAdmin(
        termPolicyId: string,
        content: ITermPolicyContent,
        updatedBy: string
    ): Promise<void>;
    removeContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage,
        updatedBy: string
    ): Promise<void>;
    getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IAwsS3Presign>;
}
