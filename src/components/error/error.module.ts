import { Module } from '@nestjs/common';
import { ErrorService } from 'components/error/error.service';
import { LanguageModule } from 'components/language/language.module';

@Module({
    providers: [ErrorService],
    exports: [ErrorService],
    imports: [LanguageModule],
})
export class ErrorModule {}
