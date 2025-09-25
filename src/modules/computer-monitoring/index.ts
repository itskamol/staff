// Main module export
export { ComputerMonitoringModule } from './computer-monitoring.module';

// Controllers
export { ComputerUserController } from './controllers/computer-user.controller';
export { ComputerController } from './controllers/computer.controller';
export { MonitoringController } from './controllers/monitoring.controller';
export { AgentController } from './controllers/agent.controller';
export { PolicyController } from './controllers/policy.controller';

// Services
export { ComputerUserService } from './services/computer-user.service';
export { ComputerService } from './services/computer.service';
export { MonitoringService } from './services/monitoring.service';
export { AgentService } from './services/agent.service';
export { ActivityReportService } from './services/activity-report.service';
export { PolicyService } from './services/policy.service';

// Repositories
export { ComputerUserRepository } from './repositories/computer-user.repository';
export { ComputerRepository } from './repositories/computer.repository';
export { MonitoringRepository } from './repositories/monitoring.repository';
export { PolicyRepository } from './repositories/policy.repository';

// Processors
export { AgentDataProcessor } from './processors/agent-data.processor';