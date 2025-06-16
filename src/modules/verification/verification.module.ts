import { Module } from '@nestjs/common';
import { VerificationRepositoryModule } from '@modules/verification/repository/verification.repository.module';
import { VerificationService } from '@modules/verification/services/verification.service';

@Module({
    imports: [VerificationRepositoryModule],
    exports: [VerificationService],
    providers: [VerificationService],
    controllers: [],
})
export class VerificationModule {}
