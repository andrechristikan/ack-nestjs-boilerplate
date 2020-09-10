import { Module } from '@nestjs/common';
import { ErrorService } from 'error/error.service';
import { LanguageModule } from 'language/language.module';

@Module({
    providers: [ErrorService],
    exports: [ErrorService],
    imports: [LanguageModule],
})
export class ErrorModule {}
