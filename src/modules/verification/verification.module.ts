import { Module } from '@nestjs/common';
import { VerificationUtil } from '@modules/verification/utils/verification.util';
import { VerificationRepository } from '@modules/verification/repositories/verification.repository';
import { VerificationService } from '@modules/verification/services/verification.service';

@Module({
    imports: [],
    exports: [VerificationUtil, VerificationRepository, VerificationService],
    providers: [VerificationUtil, VerificationRepository, VerificationService],
    controllers: [],
})
export class VerificationModule {}
