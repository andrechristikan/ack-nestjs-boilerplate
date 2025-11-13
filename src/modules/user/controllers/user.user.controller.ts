import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
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
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    UserUserAddMobileNumberDoc,
    UserUserClaimUsernameDoc,
    UserUserDeleteMobileNumberDoc,
    UserUserDeleteSelfDoc,
    UserUserUpdateMobileNumberDoc,
} from '@modules/user/docs/user.user.doc';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import {
    UserAddMobileNumberRequestDto,
    UserUpdateMobileNumberRequestDto,
} from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(private readonly userService: UserService) {}

    @UserUserDeleteSelfDoc()
    @Response('user.deleteSelf')
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

    @UserUserAddMobileNumberDoc()
    @Response('user.addMobileNumber')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/mobile-number/add')
    async addMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto,
        @Body()
        body: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.userService.addMobileNumber(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserUserUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/mobile-number/update/:mobileNumberId')
    async updateMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Param('mobileNumberId') mobileNumberId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.updateMobileNumber(
            userId,
            mobileNumberId,
            body,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @UserUserDeleteMobileNumberDoc()
    @Response('user.deleteMobileNumber')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/mobile-number/delete/:mobileNumberId')
    async deleteMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Param('mobileNumberId') mobileNumberId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.deleteMobileNumber(userId, mobileNumberId, {
            ipAddress,
            userAgent,
        });
    }

    // TODO: VERIFIED MOBILE NUMBER REQUIRED
    // WHICH PROVIDER ?

    @UserUserClaimUsernameDoc()
    @Response('user.claimUsername')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/username/claim')
    async claimUsername(
        @AuthJwtPayload('userId') userId: string,
        @Body()
        body: UserClaimUsernameRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.claimUsername(userId, body, {
            ipAddress,
            userAgent,
        });
    }
}
