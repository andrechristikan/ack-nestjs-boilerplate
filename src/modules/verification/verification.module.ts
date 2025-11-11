import { Module } from '@nestjs/common';
import { VerificationUtil } from '@modules/verification/utils/verification.util';

@Module({
    imports: [],
    exports: [VerificationUtil],
    providers: [VerificationUtil],
    controllers: [],
})
export class VerificationModule {}
