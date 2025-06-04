import { Module } from '@nestjs/common';
import { AwsModule } from '@module/aws/aws.module';
import { EmailService } from '@module/email/services/email.service';

@Module({
    imports: [AwsModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
