import { Module } from '@nestjs/common';
import { ErrorService } from 'error/error.service';

@Module({
    providers: [ErrorService],
    exports: [ErrorService],
    imports: [],
})
export class ErrorModule {}
