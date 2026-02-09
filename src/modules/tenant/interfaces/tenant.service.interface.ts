import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { ITenant, ITenantMember } from '@modules/tenant/interfaces/tenant.interface';

export interface ITenantService {
    validateTenantGuard(request: IRequestApp): Promise<ITenant>;
    validateTenantMemberGuard(request: IRequestApp): Promise<ITenantMember>;
    validateTenantRoleGuard(
        request: IRequestApp,
        requiredRoleNames: string[]
    ): Promise<boolean>;
    validateTenantPermissionGuard(
        request: IRequestApp,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean>;

    getListOffset(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<TenantResponseDto>>;
    create(
        dto: TenantCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>>;
    update(
        id: string,
        dto: TenantUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    delete(id: string, updatedBy: string): Promise<IResponseReturn<void>>;

    addMember(
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
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    getMembersOffset(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>>;

    getMyTenantsCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>>;
    getCurrentTenant(
        tenantId: string,
        userId: string
    ): Promise<IResponseReturn<TenantMemberResponseDto>>;
}
