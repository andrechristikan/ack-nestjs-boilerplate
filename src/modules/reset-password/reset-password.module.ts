import { ResetPasswordRepository } from '@modules/reset-password/repositories/reset-password.repository';
import { ResetPasswordUtil } from '@modules/reset-password/utils/reset-password.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [ResetPasswordUtil, ResetPasswordRepository],
    providers: [ResetPasswordUtil, ResetPasswordRepository],
    controllers: [],
})
export class ResetPasswordModule {}
