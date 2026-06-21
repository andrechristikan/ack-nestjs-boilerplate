import { Injectable } from '@nestjs/common';
import { IFileService } from '@common/file/interfaces/file.service.interface';
import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { HelperService } from '@common/helper/services/helper.service';
import Mime from 'mime';
import Papa from 'papaparse';

@Injectable()
export class FileService implements IFileService {
    constructor(private readonly helperService: HelperService) {}

    writeCsv<T = Record<string, string | number | Date>>(rows: T[]): string {
        return Papa.unparse(rows, {
            delimiter: ';',
        });
    }

    readCsv<T = Record<string, string | number | Date>>(file: string): T[] {
        const parsed = Papa.parse<T>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            fastMode: true,
            transform(value) {
                return value === '' ? null : value;
            },
        });

        return parsed.data;
    }

    createRandomFilename({
        prefix,
        path,
        extension,
        randomLength,
    }: IFileRandomFilenameOptions): string {
        const randomPath = this.helperService.randomString(randomLength ?? 10);
        let fullPath: string = `${path ? `${path}/` : ''}${prefix ? `${prefix}-` : ''}${randomPath}.${extension.toLowerCase()}`;

        if (fullPath.startsWith('/')) {
            fullPath = fullPath.replace('/', '');
        }

        return fullPath;
    }

    extractExtensionFromFilename(filename: string): string {
        return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    extractMimeFromFilename(filename: string): string | null {
        return Mime.getType(filename.slice(filename.lastIndexOf('.')))?.toLowerCase() ?? null;
    }

    extractFilenameFromPath(filePath: string): string {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
    }
}
