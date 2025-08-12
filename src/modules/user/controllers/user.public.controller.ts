import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserPublicLoginWithCredentialDoc } from '@modules/user/docs/user.public.doc';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserService } from '@modules/user/services/user.service';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(private readonly userService: UserService) {}

    @UserPublicLoginWithCredentialDoc()
    @Response('user.loginWithCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body() data: UserLoginRequestDto
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        const tokens = await this.userService.loginWithCredential(data);

        return {
            data: tokens,
        };
    }
}
