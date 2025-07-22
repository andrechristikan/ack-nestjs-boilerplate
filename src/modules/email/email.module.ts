import { Module } from '@nestjs/common';
import { AwsModule } from '@modules/aws/aws.module';
import { EmailService } from '@modules/email/services/email.service';
import { EmailTemplateService } from '@modules/email/services/email.template.service';

@Module({
    imports: [AwsModule],
    providers: [EmailService, EmailTemplateService],
    exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
