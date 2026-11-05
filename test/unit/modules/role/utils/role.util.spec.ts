import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleUtil } from '@modules/role/utils/role.util';

describe('RoleUtil', () => {
    let util: RoleUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [RoleUtil],
        }).compile();

        util = module.get(RoleUtil);
    });

    describe('mapActivityLogMetadata', () => {
        it('maps the role fields and timestamp into activity log metadata', () => {
            const role: IRole = {
                id: 'role-1',
                type: EnumRoleType.admin,
                name: 'manager',
                isImmutable: false,
            };
            const timestamp = new Date('2026-01-20T00:00:00.000Z');

            const result = util.mapActivityLogMetadata(role, timestamp);

            expect(result).toEqual({
                roleId: role.id,
                roleName: role.name,
                roleType: role.type,
                timestamp,
            });
        });
    });

    describe('outranks', () => {
        it.each([
            [EnumRoleType.superAdmin, EnumRoleType.superAdmin],
            [EnumRoleType.superAdmin, EnumRoleType.admin],
            [EnumRoleType.superAdmin, EnumRoleType.user],
            [EnumRoleType.admin, EnumRoleType.user],
        ])(
            'returns true for a %s actor on a %s target',
            (actorType, targetType) => {
                expect(util.outranks(actorType, targetType)).toBe(true);
            }
        );

        it.each([
            [EnumRoleType.admin, EnumRoleType.superAdmin],
            [EnumRoleType.admin, EnumRoleType.admin],
            [EnumRoleType.user, EnumRoleType.user],
            [EnumRoleType.user, EnumRoleType.admin],
        ])(
            'returns false for a %s actor on a %s target',
            (actorType, targetType) => {
                expect(util.outranks(actorType, targetType)).toBe(false);
            }
        );
    });

    describe('changesImmutableType', () => {
        const immutableRole: IRole = {
            id: 'role-1',
            type: EnumRoleType.admin,
            name: 'admin',
            isImmutable: true,
        };

        it('returns true for an immutable role and another type', () => {
            expect(
                util.changesImmutableType(immutableRole, EnumRoleType.user)
            ).toBe(true);
        });

        it('returns false for an immutable role and the same type', () => {
            expect(
                util.changesImmutableType(immutableRole, EnumRoleType.admin)
            ).toBe(false);
        });

        it('returns false for a mutable role and another type', () => {
            expect(
                util.changesImmutableType(
                    { ...immutableRole, isImmutable: false },
                    EnumRoleType.user
                )
            ).toBe(false);
        });
    });
});
