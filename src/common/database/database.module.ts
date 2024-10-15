import { DynamicModule, Global, Module } from '@nestjs/common';
import { DatabaseOptionService } from 'src/common/database/services/database.options.service';
import { DatabaseService } from 'src/common/database/services/database.service';

@Module({
    providers: [DatabaseOptionService],
    exports: [DatabaseOptionService],
    imports: [],
    controllers: [],
})
export class DatabaseOptionModule {}

@Global()
@Module({})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            providers: [DatabaseService],
            exports: [DatabaseService],
            imports: [],
            controllers: [],
        };
    }
}
