import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IAuthSocialNonce } from '@modules/auth/interfaces/auth.interface';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthCreateSocialNonceUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAuthSocialNonce>
> {
    constructor(private readonly authSocialService: AuthSocialService) {}

    async execute(): Promise<IResponseReturn<IAuthSocialNonce>> {
        const nonce = await this.authSocialService.createNonce();

        return { data: nonce };
    }
}
