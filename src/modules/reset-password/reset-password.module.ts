import { Module } from '@nestjs/common';
import { ResetPasswordRepositoryModule } from '@modules/reset-password/repository/reset-password.repository.module';
import { ResetPasswordService } from '@modules/reset-password/services/reset-password.service';

@Module({
    imports: [ResetPasswordRepositoryModule],
    exports: [ResetPasswordService],
    providers: [ResetPasswordService],
    controllers: [],
})
export class ResetPasswordModule {}
