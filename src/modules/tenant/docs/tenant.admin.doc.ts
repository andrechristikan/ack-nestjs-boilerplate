import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { TenantDocParamsId } from '@modules/tenant/constants/tenant.doc.constant';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantJitAccessRequestDto } from '@modules/tenant/dtos/request/tenant.jit-access.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantJitAccessResponseDto } from '@modules/tenant/dtos/response/tenant.jit-access.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function TenantAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all tenants',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging<TenantResponseDto>('tenant.list', {
            dto: TenantResponseDto,
        })
    );
}

export function TenantAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create tenant',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantCreateRequestDto,
        }),
        DocGuard({ policy: true }),
        DocResponse<DatabaseIdDto>('tenant.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdDto,
        })
    );
}

export function TenantAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get tenant by id',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: TenantDocParamsId,
        }),
        DocGuard({ policy: true }),
        DocResponse<TenantResponseDto>('tenant.get', {
            dto: TenantResponseDto,
        })
    );
}

export function TenantAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update tenant',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: TenantDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantUpdateRequestDto,
        }),
        DocGuard({ policy: true }),
        DocResponse('tenant.update')
    );
}

export function TenantAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete tenant',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: TenantDocParamsId,
        }),
        DocGuard({ policy: true }),
        DocResponse('tenant.delete')
    );
}

export function TenantAdminAssumeAccessDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'assume jit tenant access',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: TenantDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantJitAccessRequestDto,
        }),
        DocGuard({ policy: true }),
        DocResponse<TenantJitAccessResponseDto>('tenant.assumeAccess', {
            httpStatus: HttpStatus.CREATED,
            dto: TenantJitAccessResponseDto,
        })
    );
}

export function TenantAdminRevokeAccessDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke jit tenant access',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: TenantDocParamsId,
        }),
        DocGuard({ policy: true }),
        DocResponse('tenant.revokeAccess')
    );
}
