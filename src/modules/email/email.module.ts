import { Module } from '@nestjs/common';
import { EmailService } from 'src/modules/email/services/email.service';
import { AwsModule } from 'src/common/aws/aws.module';

@Module({
    imports: [AwsModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
