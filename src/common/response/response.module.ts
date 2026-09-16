import { DynamicModule, Module } from '@nestjs/common';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Global module exposing response-layer utilities (metadata mapping).
 */
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
