import { Module } from '@nestjs/common';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { AwsSESService } from 'src/common/aws/services/aws.ses.service';

@Module({
    exports: [AwsS3Service, AwsSESService],
    providers: [AwsS3Service, AwsSESService],
    imports: [],
    controllers: [],
})
export class AwsModule {}
