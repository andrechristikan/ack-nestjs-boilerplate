import { Test } from '@nestjs/testing';
import { genSaltSync, hashSync } from 'bcryptjs';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';

describe('HelperHashService', () => {
    let service: HelperHashService;

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [HelperHashService],
        }).compile();

        service = moduleRefRef.get<HelperHashService>(HelperHashService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('randomSalt', () => {
        it('should return a string of length specified as an argument', () => {
            const salt = service.randomSalt(10);
            expect(salt).toHaveLength(29);
        });
    });

    describe('bcrypt', () => {
        it('should encrypt the password string with the given salt', () => {
            const salt = genSaltSync(10);
            const encryptedPassword = service.bcrypt('myPassword', salt);
            expect(encryptedPassword).toBeDefined();
            expect(typeof encryptedPassword).toEqual('string');
            expect(encryptedPassword).not.toEqual('myPassword');
        });
    });

    describe('bcryptCompare', () => {
        it('should return true for matching password and hashed password', () => {
            const salt = genSaltSync(10);
            const hashedPassword = hashSync('myPassword', salt);
            expect(
                service.bcryptCompare('myPassword', hashedPassword)
            ).toBeTruthy();
        });

        it('should return false for different password and hashed password', () => {
            const salt = genSaltSync(10);
            const hashedPassword = hashSync('myPassword', salt);
            expect(
                service.bcryptCompare('notMyPassword', hashedPassword)
            ).toBeFalsy();
        });
    });

    describe('sha256', () => {
        it('should hash the given string using SHA256 algorithm', () => {
            const hashedString = service.sha256('myString');
            expect(hashedString).toBeDefined();
            expect(typeof hashedString).toEqual('string');
            expect(hashedString).not.toEqual('myString');
        });
    });

    describe('sha256Compare', () => {
        it('should return true for matching hashed strings', () => {
            const hashedString = service.sha256('myString');
            expect(
                service.sha256Compare(hashedString, hashedString)
            ).toBeTruthy();
        });

        it('should return false for different hashed strings', () => {
            const hashedString1 = service.sha256('myString1');
            const hashedString2 = service.sha256('myString2');
            expect(
                service.sha256Compare(hashedString1, hashedString2)
            ).toBeFalsy();
        });
    });
});
