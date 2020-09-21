import { Module } from '@nestjs/common';
import { DatabaseService } from 'database/database.service';

@Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
    imports: [],
})
export class DatabaseModule {}
