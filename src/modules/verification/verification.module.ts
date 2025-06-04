import { Module } from '@nestjs/common';
import { VerificationRepositoryModule } from '@module/verification/repository/verification.repository.module';
import { VerificationService } from '@module/verification/services/verification.service';

@Module({
    imports: [VerificationRepositoryModule],
    exports: [VerificationService],
    providers: [VerificationService],
    controllers: [],
})
export class VerificationModule {}
