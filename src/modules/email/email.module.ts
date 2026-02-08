import { Module } from '@nestjs/common';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { AwsModule } from '@common/aws/aws.module';
import { EmailProcessorService } from '@modules/email/services/email.processor.service';
import { EmailSharedModule } from '@modules/email/email.shared.module';

@Module({
    imports: [AwsModule, EmailSharedModule],
    providers: [EmailTemplateService, EmailProcessorService],
    exports: [EmailTemplateService, EmailProcessorService],
})
export class EmailModule {}
