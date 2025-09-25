import { DynamicModule, Global, Module } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

/**
 * Dynamic module providing file handling services.
 * Exports FileService for use in other modules requiring file operations.
 */
@Global()
@Module({})
export class FileModule {
    static forRoot(): DynamicModule {
        return {
            module: FileModule,
            providers: [FileService],
            exports: [FileService],
            imports: [],
            controllers: [],
        };
    }
}
