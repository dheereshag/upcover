import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

const mockUser = {
  _id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashedpassword',
};

describe('UsersService', () => {
  let service: UsersService;
  let saveMock: jest.Mock;
  let findOneMock: jest.Mock;
  let module: TestingModule;

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(mockUser);
    findOneMock = jest.fn();

    const MockUserModel: any = jest
      .fn()
      .mockImplementation(() => ({ save: saveMock }));
    MockUserModel.findOne = findOneMock;

    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await module.close();
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const result = await service.create({
        email: 'test@example.com',
        password: 'hashedpassword',
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      findOneMock.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });

      const result = await service.findByEmail('test@example.com');

      expect(findOneMock).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      findOneMock.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });
});
