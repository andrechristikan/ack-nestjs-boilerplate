import { AuthCreateSocialNonceUseCase } from '@modules/auth/use-cases/auth.create-social-nonce.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [AuthCreateSocialNonceUseCase],
    exports: [AuthCreateSocialNonceUseCase],
    imports: [],
})
export class AuthUseCaseModule {}
