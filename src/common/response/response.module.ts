import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/** Shared module: ResponseMetadataService for the response interceptors and the exception filters in src/app/filters/. */
@Global()
@Module({})
export class ResponseModule {
    static forRoot(): DynamicModule {
        return {
            module: ResponseModule,
            controllers: [],
            providers: [ResponseMetadataService],
            exports: [ResponseMetadataService],
            imports: [],
        };
    }
}
