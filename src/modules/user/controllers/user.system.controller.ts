import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    UserSystemCheckEmailDoc,
    UserSystemCheckUsernameDoc,
} from '@modules/user/docs/user.system.doc';
import {
    UserCheckEmailRequestDto,
    UserCheckEmailRequestSchema,
    UserCheckUsernameRequestDto,
    UserCheckUsernameRequestSchema,
} from '@modules/user/dtos/request/user.check.request.dto';
import {
    UserCheckEmailResponseSchema,
    UserCheckUsernameResponseSchema,
} from '@modules/user/dtos/response/user.check.response.dto';
import {
    IUserCheckEmail,
    IUserCheckUsername,
} from '@modules/user/interfaces/user.interface';
import { UserHttpService } from '@modules/user/services/user.http.service';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSystemController {
    constructor(private readonly userHttpService: UserHttpService) {}

    @UserSystemCheckUsernameDoc()
    @Response('user.checkUsername', {
        schema: UserCheckUsernameResponseSchema,
    })
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/username/check')
    async checkUsername(
        @Body({ schema: UserCheckUsernameRequestSchema })
        body: UserCheckUsernameRequestDto
    ): Promise<IResponseReturn<IUserCheckUsername>> {
        return this.userHttpService.checkUsername(body);
    }

    @UserSystemCheckEmailDoc()
    @Response('user.checkEmail', { schema: UserCheckEmailResponseSchema })
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/email/check')
    async checkEmail(
        @Body({ schema: UserCheckEmailRequestSchema })
        body: UserCheckEmailRequestDto
    ): Promise<IResponseReturn<IUserCheckEmail>> {
        return this.userHttpService.checkEmail(body);
    }
}
