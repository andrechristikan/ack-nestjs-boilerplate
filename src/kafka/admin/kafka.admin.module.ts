import { Module } from '@nestjs/common';
import { KafkaAdminService } from './kafka.admin.service';

@Module({
    providers: [KafkaAdminService],
    exports: [KafkaAdminService],
    controllers: [],
    imports: []
})
export class KafkaAdminModule {}
