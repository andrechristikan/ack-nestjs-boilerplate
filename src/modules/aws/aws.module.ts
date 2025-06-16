import { Module } from '@nestjs/common';
import { AwsPinpointService } from '@modules/aws/services/aws.pinpoint.service';
import { AwsS3Service } from '@modules/aws/services/aws.s3.service';
import { AwsSESService } from '@modules/aws/services/aws.ses.service';

@Module({
    exports: [AwsS3Service, AwsSESService, AwsPinpointService],
    providers: [AwsS3Service, AwsSESService, AwsPinpointService],
    imports: [],
    controllers: [],
})
export class AwsModule {}
