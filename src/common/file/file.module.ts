import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

/** Shared module: FileService for the file pipes, the response file interceptor, and the services and use cases handling a file. */
@Global()
@Module({})
export class FileModule {
    static forRoot(): DynamicModule {
        return {
            module: FileModule,
            controllers: [],
            providers: [FileService],
            exports: [FileService],
            imports: [],
        };
    }
}
