import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthSocialNonceResponseSchema } from '@modules/auth/dtos/response/auth.social-nonce.response.dto';
import type { IAuthSocialNonce } from '@modules/auth/interfaces/auth.interface';
import { AuthCreateSocialNonceUseCase } from '@modules/auth/use-cases/auth.create-social-nonce.use-case';
import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthPublicController {
    constructor(
        private readonly authCreateSocialNonceUseCase: AuthCreateSocialNonceUseCase
    ) {}

    @Doc({ summary: 'create social login nonce' })
    @Response('auth.createSocialNonce', {
        schema: AuthSocialNonceResponseSchema,
    })
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Post('/social/nonce/create')
    async createSocialNonce(): Promise<IResponseReturn<IAuthSocialNonce>> {
        return this.authCreateSocialNonceUseCase.execute();
    }
}
