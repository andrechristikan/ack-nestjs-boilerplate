import { AwsS3ResponseDto } from '@common/aws/dtos/response/aws.s3.response.dto';
import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Minimal user shape embedded in another module's response.
 */
export class UserRefResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: false,
        maxLength: 100,
        minLength: 1,
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
    })
    @Expose()
    username: Lowercase<string>;

    @ApiProperty({
        required: false,
        type: AwsS3ResponseDto,
    })
    @Expose()
    @Type(() => AwsS3ResponseDto)
    photo?: AwsS3ResponseDto;
}
