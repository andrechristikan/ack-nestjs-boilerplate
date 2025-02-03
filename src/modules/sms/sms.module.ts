import { Module } from '@nestjs/common';
import { AwsModule } from 'src/modules/aws/aws.module';
import { SmsService } from 'src/modules/sms/services/sms.service';

@Module({
    imports: [AwsModule],
    exports: [SmsService],
    providers: [SmsService],
    controllers: [],
})
export class SmsModule {}
