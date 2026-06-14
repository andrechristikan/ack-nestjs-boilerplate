import { DynamicModule, Module } from '@nestjs/common';
import { ResponseUtil } from '@common/response/utils/response.util';

/**
 * Global module exposing response-layer utilities (serialization).
 */
@Module({})
export class ResponseModule {
    static forRoot(): DynamicModule {
        return {
            module: ResponseModule,
            global: true,
            providers: [ResponseUtil],
            exports: [ResponseUtil],
        };
    }
}
