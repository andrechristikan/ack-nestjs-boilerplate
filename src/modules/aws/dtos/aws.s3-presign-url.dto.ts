import { ApiProperty } from '@nestjs/swagger';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

export class AwsS3PresignUrlDto extends AwsS3Dto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: 10000,
        description: 'Expired in millisecond for each presign url',
    })
    expiredIn: number;
}
