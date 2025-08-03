import { DynamicModule, Module } from '@nestjs/common';
import { FileService } from '@common/file/services/file.service';

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
