import { AuthJwtAccessPayloadPermissionDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';

describe('PolicyAbilityFactory', () => {
    let factory: PolicyAbilityFactory;

    beforeEach(async () => {
        factory = new PolicyAbilityFactory();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(factory).toBeDefined();
    });

    describe('defineFromRequest', () => {
        it('should define user ability, user can Read and Create a Api Key', () => {
            const permissionPayload: AuthJwtAccessPayloadPermissionDto[] = [
                {
                    action: '1,2',
                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                },
            ];

            const ability = factory.defineFromRequest(permissionPayload);
            expect(
                ability.can(
                    ENUM_POLICY_ACTION.READ,
                    ENUM_POLICY_SUBJECT.API_KEY
                )
            ).toBe(true);
            expect(
                ability.can(
                    ENUM_POLICY_ACTION.CREATE,
                    ENUM_POLICY_SUBJECT.API_KEY
                )
            ).toBe(true);
        });

        it('should define all ability', () => {
            const permissionPayload: AuthJwtAccessPayloadPermissionDto[] = [
                {
                    action: '0',
                    subject: ENUM_POLICY_SUBJECT.ALL,
                },
            ];

            const ability = factory.defineFromRequest(permissionPayload);
            expect(ability.can(ENUM_POLICY_ACTION.MANAGE, 'all')).toBe(true);
        });
    });

    describe('mappingFromRequest', () => {
        it('should map ability of user', () => {
            const permissionPayload: AuthJwtAccessPayloadPermissionDto = {
                action: '1,2',
                subject: ENUM_POLICY_SUBJECT.API_KEY,
            };

            const ability = factory.mappingFromRequest(permissionPayload);
            expect(Array.isArray(ability)).toBe(true);
            expect(ability.length).toBe(2);
            expect(ability).toEqual([
                {
                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                    action: ENUM_POLICY_ACTION.READ,
                },
                {
                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                    action: ENUM_POLICY_ACTION.CREATE,
                },
            ]);
        });
    });

    describe('mapping', () => {
        it('should convert action 0 from request to enum policy MANAGE', () => {
            const mapping = factory.mapping(0);

            expect(mapping).toBe(ENUM_POLICY_ACTION.MANAGE);
        });

        it('should convert action 1 from request to enum policy READ', () => {
            const mapping = factory.mapping(1);

            expect(mapping).toBe(ENUM_POLICY_ACTION.READ);
        });

        it('should convert action 2 from request to enum policy CREATE', () => {
            const mapping = factory.mapping(2);

            expect(mapping).toBe(ENUM_POLICY_ACTION.CREATE);
        });

        it('should convert action 3 from request to enum policy UPDATE', () => {
            const mapping = factory.mapping(3);

            expect(mapping).toBe(ENUM_POLICY_ACTION.UPDATE);
        });

        it('should convert action 4 from request to enum policy DELETE', () => {
            const mapping = factory.mapping(4);

            expect(mapping).toBe(ENUM_POLICY_ACTION.DELETE);
        });

        it('should convert action 5 from request to enum policy EXPORT', () => {
            const mapping = factory.mapping(5);

            expect(mapping).toBe(ENUM_POLICY_ACTION.EXPORT);
        });

        it('should convert action 6 from request to enum policy IMPORT', () => {
            const mapping = factory.mapping(6);

            expect(mapping).toBe(ENUM_POLICY_ACTION.IMPORT);
        });

        it('should convert action undefined from request to null', () => {
            const mapping = factory.mapping(undefined);

            expect(mapping).toBe(null);
        });
    });

    describe('handlerAbilities', () => {
        it('should return handle rules for policy', () => {
            const handlers = factory.handlerAbilities([
                {
                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                    action: [
                        ENUM_POLICY_ACTION.READ,
                        ENUM_POLICY_ACTION.CREATE,
                    ],
                },
            ]);

            expect(Array.isArray(handlers)).toBe(true);
            expect(handlers.length).toBe(2);

            const permissionPayload: AuthJwtAccessPayloadPermissionDto[] = [
                {
                    action: '1',
                    subject: ENUM_POLICY_SUBJECT.API_KEY,
                },
            ];

            const ability = factory.defineFromRequest(permissionPayload);
            const handler: any = handlers[0];
            expect(handler(ability)).toBe(true);
        });
    });
});
