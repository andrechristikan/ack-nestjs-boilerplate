import { Module } from '@nestjs/common';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { AwsModule } from '@common/aws/aws.module';
import { EmailUtil } from '@modules/email/utils/email.util';
import { EmailService } from '@modules/email/services/email.service';
import { EmailProcessorService } from '@modules/email/services/email.processor.service';

@Module({
    imports: [AwsModule],
    providers: [
        EmailUtil,
        EmailTemplateService,
        EmailService,
        EmailProcessorService,
    ],
    exports: [
        EmailUtil,
        EmailTemplateService,
        EmailService,
        EmailProcessorService,
    ],
})
export class EmailModule {}
