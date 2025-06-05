import { Module } from '@nestjs/common';
import { AwsModule } from '@modules/aws/aws.module';
import { EmailService } from '@modules/email/services/email.service';

@Module({
    imports: [AwsModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
