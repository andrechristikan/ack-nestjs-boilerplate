import { Injectable } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 * Centralizes response serialization. Uses class-transformer opt-in mode
 * (`excludeExtraneousValues: true`) so only `@Expose()` fields survive — a new
 * un-exposed field is dropped by default (fail-closed). The transform option is
 * defined here once for the whole application.
 */
@Injectable()
export class ResponseUtil {
    serialize<T, V>(cls: ClassConstructor<T>, plain: V[]): T[];
    serialize<T, V>(cls: ClassConstructor<T>, plain: V): T;
    serialize<T, V>(cls: ClassConstructor<T>, plain: V | V[]): T | T[] {
        return plainToInstance(cls, plain, {
            excludeExtraneousValues: true,
        });
    }
}
