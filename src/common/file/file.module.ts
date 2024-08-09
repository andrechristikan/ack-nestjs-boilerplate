import { DynamicModule, Global, Module } from '@nestjs/common';
import { FileService } from 'src/common/file/services/file.service';

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
