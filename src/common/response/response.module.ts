import { DynamicModule, Module } from '@nestjs/common';
import { ResponseUtil } from '@common/response/utils/response.util';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Global module exposing response-layer utilities (serialization, metadata mapping).
 */
@Module({})
export class ResponseModule {
    static forRoot(): DynamicModule {
        return {
            module: ResponseModule,
            global: true,
            providers: [ResponseUtil, ResponseMetadataService],
            exports: [ResponseUtil, ResponseMetadataService],
        };
    }
}
