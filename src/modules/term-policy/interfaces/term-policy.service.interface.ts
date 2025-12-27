import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { EnumTermPolicyType } from '@prisma/client';

export interface ITermPolicyService {
    validateTermPolicyGuard(
        request: IRequestApp,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void>;
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>>;
    getListPublished(
        pagination: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>>;
    getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>>;
    userAccept(
        userId: string,
        { type }: TermPolicyAcceptRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    createByAdmin(
        { contents, type, version }: TermPolicyCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>>;
    deleteByAdmin(
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicyResponseDto>>;
    generateContentPresignByAdmin({
        language,
        size,
        type,
        version,
    }: TermPolicyContentPresignRequestDto): Promise<
        IResponseReturn<AwsS3PresignDto>
    >;
    updateContentByAdmin(
        termPolicyId: string,
        { key, size, language }: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    addContentByAdmin(
        termPolicyId: string,
        { key, size, language }: TermPolicyContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    removeContentByAdmin(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
}
