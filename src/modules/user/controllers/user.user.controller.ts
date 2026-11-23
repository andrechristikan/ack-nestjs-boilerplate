import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { Response } from '@common/response/decorators/response.decorator';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { UserDeleteSelfRequestSchema } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import { UserDeleteSelfUseCase } from '@modules/user/use-cases/user.delete-self.use-case';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(
        private readonly userDeleteSelfUseCase: UserDeleteSelfUseCase
    ) {}

    @Doc({ summary: 'user delete their account' })
    @Response('user.deleteSelf')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/self/delete')
    async deleteSelf(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: UserDeleteSelfRequestSchema })
        body: UserDeleteSelfRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userDeleteSelfUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }
}
