import { DynamicModule, Module } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

/**
 * Global module providing file handling services.
 * Exports FileService for use in other modules requiring file operations.
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
