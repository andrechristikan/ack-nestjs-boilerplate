import { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserImportRequestDto extends PickType(AwsS3PresignRequestDto, [
    'size',
]) {
    @ApiProperty({
        required: true,
        description: 'import path key',
        example: 'user/import/unique-import-key.csv',
    })
    @IsString()
    @IsNotEmpty()
    importKey: string;
}
