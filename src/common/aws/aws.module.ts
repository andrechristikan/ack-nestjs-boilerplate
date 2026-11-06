import { Module } from '@nestjs/common';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSESService } from '@common/aws/services/aws.ses.service';

@Module({
    controllers: [],
    providers: [AwsS3Service, AwsSESService],
    exports: [AwsS3Service, AwsSESService],
    imports: [],
})
export class AwsModule {}
