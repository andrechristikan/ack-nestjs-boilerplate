import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { ITenant, ITenantMember } from '@modules/tenant/interfaces/tenant.interface';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';

export interface ITenantService {
    validateTenantGuard(request: IRequestAppWithTenant): Promise<ITenant>;
    validateTenantMemberGuard(
        request: IRequestAppWithTenant
    ): Promise<ITenantMember>;
    validateTenantRoleGuard(
        request: IRequestAppWithTenant,
        requiredRoleNames: string[]
    ): Promise<boolean>;
    validateTenantPermissionGuard(
        request: IRequestAppWithTenant,
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
}
