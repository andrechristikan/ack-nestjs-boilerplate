import { ApiProperty } from '@nestjs/swagger';
import { IFile } from '@common/file/interfaces/file.interface';

/**
 * Multipart body shape for endpoints accepting a single file upload.
 */
export class FileUploadSingleRequestDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Single file',
    })
    file: IFile;
}
