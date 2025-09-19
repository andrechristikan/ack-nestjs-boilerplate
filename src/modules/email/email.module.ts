import { Module } from '@nestjs/common';
import { EmailService } from '@modules/email/services/email.service';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { AwsModule } from '@common/aws/aws.module';

@Module({
    imports: [AwsModule],
    providers: [EmailService, EmailTemplateService],
    exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
