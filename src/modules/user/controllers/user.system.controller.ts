import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    UserSystemCheckEmailDoc,
    UserSystemCheckUsernameDoc,
} from '@modules/user/docs/user.system.doc';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserService } from '@modules/user/services/user.service';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSystemController {
    constructor(private readonly userService: UserService) {}

    @UserSystemCheckUsernameDoc()
    @Response('user.checkUsername')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/username/check')
    async checkUsername(
        @Body() body: UserCheckUsernameRequestDto
    ): Promise<IResponseReturn<UserCheckUsernameResponseDto>> {
        return this.userService.checkUsername(body);
    }

    @UserSystemCheckEmailDoc()
    @Response('user.checkEmail')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/email/check')
    async checkEmail(
        @Body() body: UserCheckEmailRequestDto
    ): Promise<IResponseReturn<UserCheckEmailResponseDto>> {
        return this.userService.checkEmail(body);
    }
}
