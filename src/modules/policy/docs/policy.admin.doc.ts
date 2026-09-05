import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    PolicyDocParamsId,
    PolicyDocParamsRoleId,
} from '@modules/policy/constants/policy.doc.constant';
import { PolicyDto, PolicySchema } from '@modules/policy/dtos/policy.dto';
import {
    PolicyListResponseDto,
    PolicyListResponseSchema,
} from '@modules/policy/dtos/response/policy.list.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function PolicyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all policies granted by a role',
        }),
        DocRequest({
            params: PolicyDocParamsRoleId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<PolicyListResponseDto>('policy.listByRole', {
            schema: PolicyListResponseSchema,
        })
    );
}

export function PolicyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'grant a policy to a role',
        }),
        DocRequest({
            params: PolicyDocParamsRoleId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<PolicyDto>('policy.create', {
            httpStatus: HttpStatus.CREATED,
            schema: PolicySchema,
        })
    );
}

export function PolicyAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update the action list of a role policy',
        }),
        DocRequest({
            params: [...PolicyDocParamsRoleId, ...PolicyDocParamsId],
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<PolicyDto>('policy.update', {
            schema: PolicySchema,
        })
    );
}

export function PolicyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke a policy from a role',
        }),
        DocRequest({
            params: [...PolicyDocParamsRoleId, ...PolicyDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('policy.delete')
    );
}
