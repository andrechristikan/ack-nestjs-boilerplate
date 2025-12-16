import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { UserTwoFactorConfirmRequestDto } from '@modules/user/dtos/request/user.two-factor-confirm.request.dto';
import { UserTwoFactorRegenerateRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate.request.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorBackupCodesResponseDto } from '@modules/user/dtos/response/user.two-factor-backup-codes.response.dto';
import { applyDecorators } from '@nestjs/common';

export function UserUserDeleteSelfDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user delete their account',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('user.delete')
    );
}

export function UserUserTwoFactorSetupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Start two-factor setup and receive secret',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('user.twoFactor.setup', {
            dto: UserTwoFactorSetupResponseDto,
        })
    );
}

export function UserUserTwoFactorConfirmDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Confirm two-factor setup with code and get backup codes',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorConfirmRequestDto,
        }),
        DocResponse('user.twoFactor.confirm', {
            dto: UserTwoFactorBackupCodesResponseDto,
        })
    );
}

export function UserUserTwoFactorRegenerateBackupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Regenerate two-factor backup codes',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorRegenerateRequestDto,
        }),
        DocResponse('user.twoFactor.regenerate', {
            dto: UserTwoFactorBackupCodesResponseDto,
        })
    );
}

export function UserUserTwoFactorDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Disable two-factor authentication',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorDisableRequestDto,
        }),
        DocResponse('user.twoFactor.disable')
    );
}
