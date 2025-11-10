import { Module } from '@nestjs/common';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { AwsModule } from '@common/aws/aws.module';
import { EmailUtil } from '@modules/email/utils/email.util';

@Module({
    imports: [AwsModule],
    providers: [EmailUtil, EmailTemplateService],
    exports: [EmailUtil, EmailTemplateService],
})
export class EmailModule {}
