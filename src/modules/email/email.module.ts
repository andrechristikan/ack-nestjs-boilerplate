import { Module } from '@nestjs/common';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { AwsModule } from '@common/aws/aws.module';
import { EmailProcessorService } from '@modules/email/services/email.processor.service';
import { EmailUtil } from '@modules/email/utils/email.util';

@Module({
    imports: [AwsModule],
    providers: [EmailTemplateService, EmailProcessorService, EmailUtil],
    exports: [EmailTemplateService, EmailProcessorService, EmailUtil],
})
export class EmailModule {}
