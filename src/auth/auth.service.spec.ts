import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt');

const mockUser = {
  _id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashedpassword',
};

const mockUsersService: Partial<UsersService> = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService: Partial<JwtService> = {
  signAsync: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await module.close();
  });

  describe('register', () => {
    it('should register a new user and return success message', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockUsersService.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedpassword',
      });
      expect(result).toEqual({
        message: 'User registered successfully',
        email: mockUser.email,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return an access token on valid credentials', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser._id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
