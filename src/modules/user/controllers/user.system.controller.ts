import { Doc } from '@common/doc/decorators/doc.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { UserCheckEmailRequestSchema } from '@modules/user/dtos/request/user.check-email.request.dto';
import { UserCheckUsernameRequestSchema } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import { UserCheckEmailResponseSchema } from '@modules/user/dtos/response/user.check-email.response.dto';
import { UserCheckUsernameResponseSchema } from '@modules/user/dtos/response/user.check-username.response.dto';
import type {
    IUserCheckEmail,
    IUserCheckUsername,
} from '@modules/user/interfaces/user.interface';
import { UserCheckUsernameUseCase } from '@modules/user/use-cases/user.check-username.use-case';
import { UserCheckEmailUseCase } from '@modules/user/use-cases/user.check-email.use-case';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSystemController {
    constructor(
        private readonly userCheckUsernameUseCase: UserCheckUsernameUseCase,
        private readonly userCheckEmailUseCase: UserCheckEmailUseCase
    ) {}

    @Doc({ summary: 'check user exist by username' })
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
        return this.userCheckUsernameUseCase.execute(body);
    }

    @Doc({ summary: 'check user exist by email' })
    @Response('user.checkEmail', { schema: UserCheckEmailResponseSchema })
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/email/check')
    async checkEmail(
        @Body({ schema: UserCheckEmailRequestSchema })
        body: UserCheckEmailRequestDto
    ): Promise<IResponseReturn<IUserCheckEmail>> {
        return this.userCheckEmailUseCase.execute(body);
    }
}
