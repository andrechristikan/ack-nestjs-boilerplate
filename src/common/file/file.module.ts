import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

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
