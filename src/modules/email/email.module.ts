import { Module } from '@nestjs/common';
import { AwsModule } from 'src/modules/aws/aws.module';
import { EmailService } from 'src/modules/email/services/email.service';

@Module({
    imports: [AwsModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
