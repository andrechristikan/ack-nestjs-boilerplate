import { Injectable } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IFile } from 'src/common/file/interfaces/file.interface';

// Support excel and csv
@Injectable()
export class FileExcelPasswordPipe implements PipeTransform {
    constructor(readonly password: string) {}

    async transform(value: IFile): Promise<IFile> {
        if (!value) {
            return;
        }

        return {
            ...value,
            password: this.password,
        };
    }
}
