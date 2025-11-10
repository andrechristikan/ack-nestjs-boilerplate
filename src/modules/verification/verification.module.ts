import { Module } from '@nestjs/common';
import { VerificationUtil } from '@modules/verification/utils/verification.util';
import { VerificationRepository } from '@modules/verification/repositories/verification.repository';

@Module({
    imports: [],
    exports: [VerificationUtil, VerificationRepository],
    providers: [VerificationUtil, VerificationRepository],
    controllers: [],
})
export class VerificationModule {}
