import { Module } from '@nestjs/common';
import { AwsModule } from '@module/aws/aws.module';
import { SmsService } from '@module/sms/services/sms.service';

@Module({
    imports: [AwsModule],
    exports: [SmsService],
    providers: [SmsService],
    controllers: [],
})
export class SmsModule {}
