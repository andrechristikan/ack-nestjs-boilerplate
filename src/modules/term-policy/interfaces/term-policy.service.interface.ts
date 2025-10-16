import {
    IPaginationIn,
    IPaginationQueryCursorParams,
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
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';

export interface ITermPolicyService {
    validateTermPolicyGuard(
        request: IRequestApp,
        requiredTermPolicies: ENUM_TERM_POLICY_TYPE[]
    ): Promise<void>;
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
}
