import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';

// Controllers
import { ComputerUserController } from './controllers/computer-user.controller';
import { ComputerController } from './controllers/computer.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { AgentController } from './controllers/agent.controller';
import { PolicyController } from './controllers/policy.controller';

// Services
import { ComputerUserService } from './services/computer-user.service';
import { ComputerService } from './services/computer.service';
import { MonitoringService } from './services/monitoring.service';
import { AgentService } from './services/agent.service';
import { ActivityReportService } from './services/activity-report.service';
import { PolicyService } from './services/policy.service';

// Repositories
import { ComputerUserRepository } from './repositories/computer-user.repository';
import { ComputerRepository } from './repositories/computer.repository';
import { MonitoringRepository } from './repositories/monitoring.repository';
import { PolicyRepository } from './repositories/policy.repository';

// Processors
import { AgentDataProcessor } from './processors/agent-data.processor';

// Core modules
import { DatabaseModule } from '../../core/database/database.module';
import { LoggerModule } from '../../core/logger/logger.module';

@Module({
  imports: [
    // Core modules
    DatabaseModule,
    LoggerModule,
    
    // Cache module for activity reports
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),
    
    // Bull queue for background processing
    BullModule.registerQueue({
      name: 'agent-data',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [
    ComputerUserController,
    ComputerController,
    MonitoringController,
    AgentController,
    PolicyController,
  ],
  providers: [
    // Services
    ComputerUserService,
    ComputerService,
    MonitoringService,
    AgentService,
    ActivityReportService,
    PolicyService,
    
    // Repositories
    ComputerUserRepository,
    ComputerRepository,
    MonitoringRepository,
    PolicyRepository,
    
    // Background processors
    AgentDataProcessor,
  ],
  exports: [
    // Export services for use in other modules
    ComputerUserService,
    ComputerService,
    MonitoringService,
    AgentService,
    ActivityReportService,
    PolicyService,
    
    // Export repositories for direct access if needed
    ComputerUserRepository,
    ComputerRepository,
    MonitoringRepository,
    PolicyRepository,
  ],
})
export class ComputerMonitoringModule {
  constructor() {
    console.log('Computer Monitoring Module initialized');
  }
}