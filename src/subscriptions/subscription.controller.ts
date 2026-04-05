import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@Request() req: { user: { sub: string } }) {
    return this.subscriptionService.getSubscription(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  cancelSubscription(@Request() req: { user: { sub: string } }) {
    return this.subscriptionService.cancelSubscription(req.user.sub);
  }
}
