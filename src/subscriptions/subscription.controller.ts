import { Controller, Get, Post, Request, UseGuards, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanId } from './plans.constant';

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

  @UseGuards(JwtAuthGuard)
  @Post('subscription')
  createSubscription(
    @Request() req: { user: { sub: string } },
    @Body('planId') planId: PlanId,
  ) {
    return this.subscriptionService.createSubscription(req.user.sub, planId);
  }
}
