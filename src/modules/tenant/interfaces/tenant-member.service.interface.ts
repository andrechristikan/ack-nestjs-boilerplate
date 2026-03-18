import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { Prisma } from '@generated/prisma-client';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';

export interface ITenantMemberService {
    createMember(
        tenantId: string,
        dto: TenantMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>>;

    updateMember(
        tenantId: string,
        memberId: string,
        dto: TenantMemberUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;

    deleteMember(
        tenantId: string,
        memberId: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>>;

    getMembersOffset(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantMemberSelect,
            Prisma.TenantMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>>;
}
