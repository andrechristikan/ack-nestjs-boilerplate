import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

export class UserShortResponseDto extends OmitType(UserListResponseDto, [
    'role',
    'status',
    'photo',
    'createdAt',
    'updatedAt',
]) {
    @ApiHideProperty()
    @Exclude()
    role: RoleListResponseDto;

    @ApiHideProperty()
    @Exclude()
    status: ENUM_USER_STATUS;

    @ApiHideProperty()
    @Exclude()
    photo?: AwsS3Dto;

    @ApiHideProperty()
    @Exclude()
    createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    updatedAt: Date;
}
