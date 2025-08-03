import {
    Injectable,
    PipeTransform,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ENUM_FILE_MIME } from '@common/file/enums/file.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@common/file/enums/file.status-code.enum';
import { IFile, IFileInput } from '@common/file/interfaces/file.interface';

/**
 * A NestJS pipe that validates file MIME types against a list of allowed types.
 *
 * This pipe can validate single files, arrays of files, or files within nested objects.
 * It throws an UnsupportedMediaTypeException if any file has an invalid MIME type.
 *
 * @param allowedTypes - Array of allowed MIME types from ENUM_FILE_MIME
 *
 */
@Injectable()
export class FileTypePipe implements PipeTransform {
    private readonly allowedMimeTypes: Set<string>;

    constructor(private readonly allowedTypes: ENUM_FILE_MIME[]) {
        this.allowedMimeTypes = new Set(
            allowedTypes.map(type => type.toLowerCase())
        );
    }

    /**
     * Transforms and validates the input value against allowed MIME types.
     *
     * @param value - Single file, array of files, or object containing files
     * @returns The original value if validation passes
     * @throws UnsupportedMediaTypeException if any file has invalid MIME type
     */
    async transform(value: IFileInput): Promise<IFileInput> {
        if (!value) {
            return value;
        }

        const filesToValidate = this.extractFilesToValidate(value);

        if (!filesToValidate) {
            return value;
        }

        if (Array.isArray(filesToValidate)) {
            this.validateFileArray(filesToValidate);
        } else {
            this.validateSingleFile(filesToValidate);
        }

        return value;
    }

    /**
     * Extracts files to validate based on target field configuration.
     *
     * @param value - Input value that may contain files
     * @returns Files to validate or null if none found
     */
    private extractFilesToValidate(value: IFileInput): IFile | IFile[] | null {
        if (this.isEmptyValue(value)) {
            return null;
        }

        return value as IFile | IFile[];
    }

    /**
     * Checks if a value is empty (null, undefined, empty object, or empty array).
     *
     * @param value - Value to check
     * @returns True if value is empty, false otherwise
     */
    private isEmptyValue(value: unknown): boolean {
        return (
            !value ||
            (typeof value === 'object' &&
                !Array.isArray(value) &&
                Object.keys(value).length === 0) ||
            (Array.isArray(value) && value.length === 0)
        );
    }

    /**
     * Validates an array of files.
     *
     * @param files - Array of files to validate
     * @throws UnsupportedMediaTypeException if any file has invalid MIME type
     */
    private validateFileArray(files: IFile[]): void {
        for (const file of files) {
            if (file?.mimetype) {
                this.validateMimeType(file.mimetype);
            }
        }
    }

    /**
     * Validates a single file.
     *
     * @param file - File to validate
     * @throws UnsupportedMediaTypeException if file has invalid MIME type
     */
    private validateSingleFile(file: IFile): void {
        if (file?.mimetype) {
            this.validateMimeType(file.mimetype);
        }
    }

    /**
     * Validates a MIME type against the allowed types.
     *
     * @param mimetype - MIME type string to validate
     * @throws UnsupportedMediaTypeException if MIME type is not allowed
     */
    private validateMimeType(mimetype: string): void {
        const normalizedMimeType = mimetype.toLowerCase().trim();

        if (!this.allowedMimeTypes.has(normalizedMimeType)) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.MIME_INVALID,
                message: 'file.error.mimeInvalid',
            });
        }
    }
}
