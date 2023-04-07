import { Test, TestingModule } from '@nestjs/testing';
import { RoleCreateDto } from 'src/common/role/dtos/role.create.dto';
import { RoleUpdatePermissionDto } from 'src/common/role/dtos/role.update-permission.dto';
import { RoleUpdateDto } from 'src/common/role/dtos/role.update.dto';
import { RoleRepository } from 'src/common/role/repository/repositories/role.repository';
import {
    RoleDatabaseName,
    RoleDoc,
    RoleEntity,
    RoleSchema,
} from 'src/common/role/repository/entities/role.entity';
import { RoleService } from 'src/common/role/services/role.service';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

describe('RoleService', () => {
    let service: RoleService;
    let repository: RoleRepository;
    const roleId = faker.datatype.uuid();
    const roleEntityDoc = new mongoose.Mongoose().model(
        RoleDatabaseName,
        RoleSchema
    );

    beforeEach(async () => {
        const moduleRefRef: TestingModule = await Test.createTestingModule({
            providers: [
                RoleService,
                {
                    provide: RoleRepository,
                    useValue: {
                        findAll: jest
                            .fn()
                            .mockResolvedValue([
                                new RoleEntity(),
                                new RoleEntity(),
                            ]),
                        findOneById: jest
                            .fn()
                            .mockImplementation((id: string) => {
                                const find = new roleEntityDoc();
                                find._id = id;

                                return find;
                            }),
                        findOne: jest.fn().mockImplementation(({ name }) => {
                            const find = new roleEntityDoc();
                            find._id = roleId;
                            find.name = name;

                            return find;
                        }),
                        getTotal: jest.fn().mockResolvedValue(1),
                        exists: jest.fn().mockResolvedValue(true),
                        create: jest.fn().mockImplementation(() => {
                            const find = new roleEntityDoc();
                            find._id = roleId;

                            return find;
                        }),
                        save: jest.fn().mockImplementation(() => {
                            const find = new roleEntityDoc();
                            find._id = roleId;

                            return find;
                        }),
                        softDelete: jest.fn().mockImplementation(() => {
                            const find = new roleEntityDoc();
                            find._id = roleId;

                            return find;
                        }),
                        deleteMany: jest.fn().mockResolvedValue(true),
                        createMany: jest.fn().mockResolvedValue(true),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<RoleService>(RoleService);
        repository = moduleRefRef.get<RoleRepository>(RoleRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should find all roles', async () => {
            const result = await service.findAll();

            expect(repository.findAll).toHaveBeenCalled();
            expect(result.length).toEqual(2);
        });
    });

    describe('findOneById', () => {
        it('should find role by id', async () => {
            const result = await service.findOneById('id');

            expect(repository.findOneById).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe('id');
        });
    });

    describe('findOne', () => {
        it('should find role by name', async () => {
            const result = await service.findOne({});

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('findOneByName', () => {
        it('should find role by name', async () => {
            const result = await service.findOneByName('role-name');

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result.name).toBe('role-name');
        });
    });

    describe('getTotal', () => {
        it('should get total number of settings', async () => {
            const result = await service.getTotal();

            expect(repository.getTotal).toHaveBeenCalled();
            expect(typeof result).toBe('number');
            expect(result).toBe(1);
        });
    });

    describe('existByName', () => {
        it('should return boolean value of exist data', async () => {
            const result = await service.existByName('role-name');

            expect(repository.exists).toHaveBeenCalled();
            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });
    });

    describe('create', () => {
        it('should create new role', async () => {
            const dto: RoleCreateDto = {
                name: 'role-name',
                permissions: [],
                type: ENUM_ROLE_TYPE.USER,
            };
            const result = await service.create(dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('update', () => {
        it('should update role value', async () => {
            const dto: RoleUpdateDto = {
                description: faker.lorem.words(),
            };
            const result = await service.update(new roleEntityDoc(), dto);

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('updatePermissions', () => {
        it('should update role value', async () => {
            const dto: RoleUpdatePermissionDto = {
                permissions: [],
                type: ENUM_ROLE_TYPE.USER,
            };
            const result = await service.updatePermissions(
                new roleEntityDoc(),
                dto
            );

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('active', () => {
        it('should update role value', async () => {
            const result = await service.active(new roleEntityDoc());

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('inactive', () => {
        it('should update role value', async () => {
            const result = await service.inactive(new roleEntityDoc());

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('delete', () => {
        it('should delete a role', async () => {
            const result = await service.delete(new roleEntityDoc());

            expect(repository.softDelete).toHaveBeenCalled();
            expect(result).toBeInstanceOf(roleEntityDoc);
            expect(result._id).toBe(roleId);
        });
    });

    describe('deleteMany', () => {
        it('should delete many roles', async () => {
            const result = await service.deleteMany({});

            expect(repository.deleteMany).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });

    describe('createMany', () => {
        it('should delete many roles', async () => {
            const result = await service.createMany([
                {
                    type: ENUM_ROLE_TYPE.USER,
                    name: faker.name.jobTitle(),
                    permissions: [],
                },
            ]);

            expect(repository.createMany).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });
});
