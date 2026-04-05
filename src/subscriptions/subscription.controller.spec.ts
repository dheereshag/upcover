import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PlanId, PLANS } from './plans.constant';

const mockUserId = 'user-id-1';
const mockReq = { user: { sub: mockUserId } };

const mockSubscription = {
  _id: 'sub-id-1',
  userId: mockUserId,
  planId: PlanId.BASIC,
  status: 'active',
};

const mockSubscriptionService: Partial<SubscriptionService> = {
  getPlans: jest.fn(),
  getSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  createSubscription: jest.fn(),
  getAllSubscriptions: jest.fn(),
};

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await module.close();
  });

  describe('getPlans', () => {
    it('should return the list of available plans', () => {
      (mockSubscriptionService.getPlans as jest.Mock).mockReturnValue(PLANS);

      const result = controller.getPlans();

      expect(mockSubscriptionService.getPlans).toHaveBeenCalled();
      expect(result).toEqual(PLANS);
    });
  });

  describe('getSubscription', () => {
    it('should return the subscription for the authenticated user', async () => {
      (mockSubscriptionService.getSubscription as jest.Mock).mockResolvedValue(
        mockSubscription,
      );

      const result = await controller.getSubscription(mockReq);

      expect(mockSubscriptionService.getSubscription).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel the subscription for the authenticated user', async () => {
      const cancelled = { ...mockSubscription, status: 'cancelled' };
      (
        mockSubscriptionService.cancelSubscription as jest.Mock
      ).mockResolvedValue(cancelled);

      const result = await controller.cancelSubscription(mockReq);

      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toEqual(cancelled);
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription for the authenticated user', async () => {
      (
        mockSubscriptionService.createSubscription as jest.Mock
      ).mockResolvedValue(mockSubscription);

      const result = await controller.createSubscription(mockReq, {
        planId: PlanId.BASIC,
      });

      expect(mockSubscriptionService.createSubscription).toHaveBeenCalledWith(
        mockUserId,
        PlanId.BASIC,
      );
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions for admin', async () => {
      const allSubs = [mockSubscription];
      (
        mockSubscriptionService.getAllSubscriptions as jest.Mock
      ).mockResolvedValue(allSubs);

      const result = await controller.getAllSubscriptions();

      expect(mockSubscriptionService.getAllSubscriptions).toHaveBeenCalled();
      expect(result).toEqual(allSubs);
    });
  });
});
