import { Injectable } from '@nestjs/common';
import type { IFileInput } from '@common/file/interfaces/file.interface';

@Injectable()
export class FileUtil {
    isEmptyInput(value: IFileInput | null): boolean {
        return (
            !value ||
            (!Array.isArray(value) && Object.keys(value).length === 0) ||
            (Array.isArray(value) && value.length === 0)
        );
    }
}
