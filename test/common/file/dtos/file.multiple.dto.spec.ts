import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IFile } from 'src/common/file/interfaces/file.interface';
import { FileMultipleDto } from 'src/common/file/dtos/file.multiple.dto';

describe('FileMultipleDto', () => {
    it('should create a valid FileMultipleDto object', () => {
        const mockFileSingleDto: FileMultipleDto = {
            files: [{}] as IFile[],
        };

        const dto = plainToInstance(FileMultipleDto, mockFileSingleDto);

        expect(dto).toBeInstanceOf(FileMultipleDto);
    });
});
