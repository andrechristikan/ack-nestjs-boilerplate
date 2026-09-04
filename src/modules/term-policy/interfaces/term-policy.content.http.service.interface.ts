import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';

export interface ITermPolicyContentHttpService {
    generateContentPresignByAdmin(
        body: TermPolicyContentPresignRequestDto
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>>;
    updateContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    addContentByAdmin(
        termPolicyId: string,
        body: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    removeContentByAdmin(
        termPolicyId: string,
        body: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    getContentByAdmin(
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>>;
}
