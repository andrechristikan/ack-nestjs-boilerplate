import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    UserUserDeleteSelfDoc,
    UserUserTwoFactorConfirmDoc,
    UserUserTwoFactorDisableDoc,
    UserUserTwoFactorRegenerateBackupDoc,
    UserUserTwoFactorSetupDoc,
} from '@modules/user/docs/user.user.doc';
import { UserTwoFactorConfirmRequestDto } from '@modules/user/dtos/request/user.two-factor-confirm.request.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorRegenerateRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate.request.dto';
import { UserTwoFactorBackupCodesResponseDto } from '@modules/user/dtos/response/user.two-factor-backup-codes.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(private readonly userService: UserService) {}

    @UserUserTwoFactorSetupDoc()
    @Response('user.twoFactor.setup')
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/2fa/setup')
    async setupTwoFactor(
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        return this.userService.setupTwoFactor(userId, {
            ipAddress,
            userAgent,
        });
    }

    @UserUserTwoFactorConfirmDoc()
    @Response('user.twoFactor.confirm')
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/2fa/confirm')
    async confirmTwoFactor(
        @AuthJwtPayload('userId') userId: string,
        @Body() body: UserTwoFactorConfirmRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorBackupCodesResponseDto>> {
        return this.userService.confirmTwoFactor(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserUserTwoFactorRegenerateBackupDoc()
    @Response('user.twoFactor.regenerate')
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/2fa/backup/regenerate')
    async regenerateTwoFactorBackupCodes(
        @AuthJwtPayload('userId') userId: string,
        @Body() body: UserTwoFactorRegenerateRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorBackupCodesResponseDto>> {
        return this.userService.regenerateTwoFactorBackupCodes(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserUserTwoFactorDisableDoc()
    @Response('user.twoFactor.disable')
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Delete('/2fa')
    async disableTwoFactor(
        @AuthJwtPayload('userId') userId: string,
        @Body() body: UserTwoFactorDisableRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.disableTwoFactor(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserUserDeleteSelfDoc()
    @Response('user.deleteSelf')
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/self')
    async deleteSelf(
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.deleteSelf(userId, {
            ipAddress,
            userAgent,
        });
    }
}
