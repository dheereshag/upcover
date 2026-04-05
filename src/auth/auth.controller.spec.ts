import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService: Partial<AuthService> = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await module.close();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expected = {
        message: 'User registered successfully',
        email: dto.email,
      };
      (mockAuthService.register as jest.Mock).mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login and return the access token', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expected = { access_token: 'jwt-token' };
      (mockAuthService.login as jest.Mock).mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
