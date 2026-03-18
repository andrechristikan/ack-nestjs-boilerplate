import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { EnumTenantMemberRole } from '@generated/prisma-client';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantTransferOwnershipRequestDto } from '@modules/tenant/dtos/request/tenant.transfer-ownership.request.dto';
import { TenantUpdateSlugRequestDto } from '@modules/tenant/dtos/request/tenant.update-slug.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { Prisma } from '@generated/prisma-client';

export interface ITenantService {
    validateTenantGuard(request: IRequestAppWithTenant): Promise<ITenant>;
    validateTenantMemberGuard(
        request: IRequestAppWithTenant
    ): Promise<ITenantMember>;
    validateTenantRoleGuard(
        request: IRequestAppWithTenant,
        requiredRoleNames: EnumTenantMemberRole[]
    ): Promise<boolean>;

    getListOffset(
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantSelect,
            Prisma.TenantWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<TenantResponseDto>>;
    create(
        dto: TenantCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>>;
    update(
        id: string,
        dto: TenantUpdateRequestDto,
        updatedBy: string,
        callerRole: EnumTenantMemberRole
    ): Promise<IResponseReturn<void>>;
    updateSlug(
        id: string,
        dto: TenantUpdateSlugRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    transferOwnership(
        tenantId: string,
        dto: TenantTransferOwnershipRequestDto,
        requestedBy: string
    ): Promise<IResponseReturn<void>>;
    delete(id: string, updatedBy: string): Promise<IResponseReturn<void>>;
}
