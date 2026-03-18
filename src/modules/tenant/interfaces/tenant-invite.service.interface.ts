import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';

export interface ITenantInviteService {
    createInvite(
        tenantId: string,
        dto: TenantInviteCreateRequestDto,
        invitedById: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<TenantInviteResponseDto>>;

    claimRegistered(token: string, requestLog: IRequestLog): Promise<void>;

    signupAndClaim(
        token: string,
        firstName: string,
        lastName: string,
        password: string,
        requestLog: IRequestLog
    ): Promise<void>;

    revokeInvite(
        inviteId: string,
        tenantId: string,
        revokedById: string
    ): Promise<IResponseReturn<void>>;

    getInviteByToken(token: string): Promise<IResponseReturn<TenantInviteResponseDto>>;

    listInvites(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantInviteSelect,
            Prisma.TenantInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantInviteResponseDto>>;
}
