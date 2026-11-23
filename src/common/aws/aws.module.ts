import { Module } from '@nestjs/common';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSesService } from '@common/aws/services/aws.ses.service';

@Module({
    controllers: [],
    providers: [AwsS3Service, AwsSesService],
    exports: [AwsS3Service, AwsSesService],
    imports: [],
})
export class AwsModule {}
