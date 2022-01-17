import { Module } from '@nestjs/common';
import { AwsService } from './aws.service';

@Module({
    imports: [],
    exports: [AwsService],
    providers: [AwsService],
    controllers: [],
})
export class AwsModule {}
