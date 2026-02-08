import { Module } from '@nestjs/common';
import { AwsModule } from '@common/aws/aws.module';
import { EmailUtil } from '@modules/email/utils/email.util';

@Module({
    imports: [AwsModule],
    providers: [EmailUtil],
    exports: [EmailUtil],
})
export class EmailSharedModule {}
