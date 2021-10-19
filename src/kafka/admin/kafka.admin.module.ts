import { Module } from '@nestjs/common';
import { KafkaAdminService } from './kafka.admin.service';

// This is useful if we dont want to allowAutoTopicCreation
// This is use for create topics with custom partition and custom replication
@Module({
    providers: [KafkaAdminService],
    exports: [KafkaAdminService],
    controllers: [],
    imports: []
})
export class KafkaAdminModule {}
