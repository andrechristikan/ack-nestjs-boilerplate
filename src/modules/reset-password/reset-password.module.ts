import { ResetPasswordUtil } from '@modules/reset-password/utils/reset-password.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [ResetPasswordUtil],
    providers: [ResetPasswordUtil],
    controllers: [],
})
export class ResetPasswordModule {}
