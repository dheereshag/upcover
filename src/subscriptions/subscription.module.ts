import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    AuthModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, JwtAuthGuard, RolesGuard],
})
export class SubscriptionModule {}
