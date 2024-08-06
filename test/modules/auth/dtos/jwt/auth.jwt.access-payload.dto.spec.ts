import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
    AuthJwtAccessPayloadDto,
    AuthJwtAccessPayloadPermissionDto,
} from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';

describe('AuthJwtAccessPayloadDto', () => {
    it('should be defined', () => {
        const dto = new AuthJwtAccessPayloadDto();
        expect(dto).toBeDefined();
    });

    it('should validate example data', async () => {
        const dto = plainToInstance(AuthJwtAccessPayloadDto, {
            loginDate: new Date(),
            loginFrom: ENUM_AUTH_LOGIN_FROM.SOCIAL_APPLE,
            _id: '12345',
            email: 'test@example.com',
            role: 'user',
            type: ENUM_POLICY_ROLE_TYPE.USER,
            permissions: [],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});

describe('AuthJwtAccessPayloadPermissionDto', () => {
    it('should be defined', () => {
        const dto = new AuthJwtAccessPayloadPermissionDto();
        expect(dto).toBeDefined();
    });

    it('should validate all action', async () => {
        const dto = plainToInstance(AuthJwtAccessPayloadPermissionDto, {
            action: [
                ENUM_POLICY_ACTION.CREATE,
                ENUM_POLICY_ACTION.UPDATE,
                ENUM_POLICY_ACTION.DELETE,
                ENUM_POLICY_ACTION.EXPORT,
                ENUM_POLICY_ACTION.IMPORT,
                ENUM_POLICY_ACTION.MANAGE,
                ENUM_POLICY_ACTION.READ,
                null,
            ],
            subject: ENUM_POLICY_SUBJECT.ALL,
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
