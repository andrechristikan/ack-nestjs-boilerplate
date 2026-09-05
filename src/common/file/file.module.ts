import { DynamicModule, Module } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

/**
 * Global module exposing `FileService` (CSV read/write, filename/MIME helpers) app-wide.
 */
@Module({})
export class FileModule {
    static forRoot(): DynamicModule {
        return {
            module: FileModule,
            global: true,
            providers: [FileService],
            exports: [FileService],
            imports: [],
            controllers: [],
        };
    }
}
