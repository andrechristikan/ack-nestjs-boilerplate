import { DynamicModule, Module } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

/**
 * Dynamic module providing file handling services.
 * Exports FileService for use in other modules requiring file operations.
 */
@Module({})
export class FileModule {
    /**
     * Creates a dynamic module configuration for file services.
     * @returns Dynamic module configuration with FileService provider
     */
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
