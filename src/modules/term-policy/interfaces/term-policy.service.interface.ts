import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
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
import { IUser } from '@modules/user/interfaces/user.interface';
import { EnumTermPolicyType, Prisma } from '@generated/prisma-client';

export interface ITermPolicyService {
    validateTermPolicyGuard(
        user: IUser | null,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void>;
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.TermPolicySelect,
            Prisma.TermPolicyWhereInput
        >,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>>;
    getListPublished(
        pagination: IPaginationQueryCursorParams<
            Prisma.TermPolicySelect,
            Prisma.TermPolicyWhereInput
        >,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>>;
    getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.TermPolicyUserAcceptanceSelect,
            Prisma.TermPolicyUserAcceptanceWhereInput
        >
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>>;
    userAccept(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
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
        IResponseReturn<AwsS3PresignResponseDto>
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
