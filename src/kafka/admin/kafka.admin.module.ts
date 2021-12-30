import { DynamicModule, Module } from '@nestjs/common';
import { KafkaAdminService } from './kafka.admin.service';

@Module({})
export class KafkaAdminModule {
    static register({ env }): DynamicModule {
        if (env === 'testing') {
            return {
                module: KafkaAdminModule,
                providers: [],
                exports: [],
                controllers: [],
                imports: []
            };
        }

        return {
            module: KafkaAdminModule,
            providers: [KafkaAdminService],
            exports: [KafkaAdminService],
            controllers: [],
            imports: []
        };
    }
}
