import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

@Module({})
export class ResponseModule {
    static forRoot(): DynamicModule {
        return {
            module: ResponseModule,
            global: true,
            providers: [ResponseMetadataService],
            exports: [ResponseMetadataService],
        };
    }
}
