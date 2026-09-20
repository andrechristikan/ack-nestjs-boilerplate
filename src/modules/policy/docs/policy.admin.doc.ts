import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function PolicyAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all policies granted by a role',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
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
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
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
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
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
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
        DocResponse('policy.delete')
    );
}
