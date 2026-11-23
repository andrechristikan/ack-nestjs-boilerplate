import {
    FileNonPrintableRegex,
    FileUnsafeFilenameCharRegex,
} from '@common/file/constants/file.constant';
import { Injectable } from '@nestjs/common';
import { FileExtensionContract } from '@common/file/contracts/file.extension.contract';
import type { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import Mime from 'mime';
import Papa from 'papaparse';
import { fileTypeFromBuffer } from 'file-type';

@Injectable()
export class FileService {
    constructor(private readonly helperStringService: HelperStringService) {}

    writeCsv<T = Record<string, string | number | Date>>(rows: T[]): string {
        return Papa.unparse(rows, {
            delimiter: ';',
            escapeFormulae: true,
        });
    }

    readCsv<T = Record<string, string | number | Date>>(file: string): T[] {
        const parsed = Papa.parse<T>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
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
        const randomPath = this.helperStringService.random(randomLength ?? 10);

        return this.helperStringService.stripLeadingSlashes(
            `${path ? `${path}/` : ''}${prefix ? `${prefix}-` : ''}${randomPath}.${extension.toLowerCase()}`
        );
    }

    extractExtensionFromFilename(filename: string): string {
        return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    extractMimeFromFilename(filename: string): string | null {
        const dotIndex = filename.lastIndexOf('.');

        if (dotIndex === -1) {
            return null;
        }

        return Mime.getType(filename.slice(dotIndex))?.toLowerCase() ?? null;
    }

    extractFilenameFromPath(filePath: string): string {
        const parts = filePath.split('/');
        return parts[parts.length - 1]!;
    }

    sanitizeFilename(filename: string): string {
        return filename
            .replace(FileNonPrintableRegex, '')
            .replace(FileUnsafeFilenameCharRegex, '')
            .trim();
    }

    async sniffExtensionFromBuffer(buffer: Buffer): Promise<string | null> {
        const sniffed = await fileTypeFromBuffer(buffer);

        return sniffed?.ext ?? null;
    }

    /** Answers `false` when the extension has no contract row, the bytes sniff to a type the row does not list, or they sniff to no type while the row lists one. */
    async isContentOfExtension(
        buffer: Buffer,
        extension: string
    ): Promise<boolean> {
        if (!(extension in FileExtensionContract)) {
            return false;
        }

        const signatures =
            FileExtensionContract[
                extension as keyof typeof FileExtensionContract
            ];
        const sniffed = await this.sniffExtensionFromBuffer(buffer);

        return sniffed === null
            ? signatures.length === 0
            : signatures.includes(sniffed);
    }
}
