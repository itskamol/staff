import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { 
  IAgentService,
  IAgentData,
  IComputerUserRegistration,
  IComputerUser
} from '../../../shared/interfaces';
import { ComputerUserRepository } from '../repositories/computer-user.repository';
import { ComputerRepository } from '../repositories/computer.repository';
import { MonitoringRepository } from '../repositories/monitoring.repository';
import { LoggerService } from '../../../core/logger/services/logger.service';

@Injectable()
export class AgentService implements IAgentService {
  constructor(
    private readonly computerUserRepository: ComputerUserRepository,
    private readonly computerRepository: ComputerRepository,
    private readonly monitoringRepository: MonitoringRepository,
    private readonly logger: LoggerService,
    @InjectQueue('agent-data') private readonly agentDataQueue: Queue,
  ) {}

  async processAgentData(data: IAgentData): Promise<void> {
    try {
      this.logger.log('Processing agent data', {
        computerUid: data.computerUid,
        computerUserSid: data.computerUserSid,
        dataType: data.dataType,
        timestamp: data.timestamp,
      });

      // Validate agent data
      await this.validateAgentData(data);

      // Add to processing queue for heavy operations
      await this.agentDataQueue.add('process-monitoring-data', data, {
        priority: this.getDataPriority(data.dataType),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log('Agent data queued for processing', {
        computerUid: data.computerUid,
        dataType: data.dataType,
      });
    } catch (error) {
      this.logger.error('Failed to process agent data', error, {
        computerUid: data.computerUid,
        dataType: data.dataType,
      });
      throw error;
    }
  }

  async registerComputerUser(registrationData: IComputerUserRegistration): Promise<IComputerUser> {
    try {
      this.logger.log('Registering computer user from agent', {
        computerUid: registrationData.computerUid,
        username: registrationData.username,
        sid: registrationData.sid,
        isInDomain: registrationData.isInDomain,
      });

      // Validate registration data
      this.validateRegistrationData(registrationData);

      // Check if computer user already exists
      let computerUser = await this.computerUserRepository.findBySid(registrationData.sid);
      
      if (computerUser) {
        // Update existing computer user with latest information
        computerUser = await this.computerUserRepository.update(computerUser.id, {
          name: registrationData.name,
          domain: registrationData.domain,
          username: registrationData.username,
          isAdmin: registrationData.isAdmin,
          isInDomain: registrationData.isInDomain,
          isActive: true,
        });

        this.logger.log('Updated existing computer user', {
          computerUserId: computerUser.id,
          sid: registrationData.sid,
        });
      } else {
        // Create new computer user
        computerUser = await this.computerUserRepository.create({
          sid: registrationData.sid,
          name: registrationData.name,
          domain: registrationData.domain,
          username: registrationData.username,
          isAdmin: registrationData.isAdmin,
          isInDomain: registrationData.isInDomain,
          isActive: true,
        });

        this.logger.log('Created new computer user', {
          computerUserId: computerUser.id,
          sid: registrationData.sid,
        });
      }

      // Ensure computer exists and is up to date
      await this.ensureComputerExists(registrationData);

      // Associate computer user with computer
      const computer = await this.computerRepository.findByUid(registrationData.computerUid);
      if (computer) {
        await this.ensureUserComputerAssociation(computerUser.id, computer.id);
      }

      this.logger.log('Successfully registered computer user', {
        computerUserId: computerUser.id,
        computerUid: registrationData.computerUid,
        username: registrationData.username,
      });

      return computerUser;
    } catch (error) {
      this.logger.error('Failed to register computer user', error, {
        computerUid: registrationData.computerUid,
        username: registrationData.username,
      });
      throw error;
    }
  }

  async validateAgentData(data: any): Promise<boolean> {
    try {
      // Validate required fields
      if (!data.computerUid) {
        throw new BadRequestException('Computer UID is required');
      }

      if (!data.computerUserSid) {
        throw new BadRequestException('Computer User SID is required');
      }

      if (!data.dataType) {
        throw new BadRequestException('Data type is required');
      }

      if (!data.data) {
        throw new BadRequestException('Data payload is required');
      }

      if (!data.timestamp) {
        throw new BadRequestException('Timestamp is required');
      }

      // Validate data type
      const validDataTypes = ['active-window', 'visited-site', 'screenshot', 'session'];
      if (!validDataTypes.includes(data.dataType)) {
        throw new BadRequestException(`Invalid data type: ${data.dataType}`);
      }

      // Validate timestamp
      const timestamp = new Date(data.timestamp);
      if (isNaN(timestamp.getTime())) {
        throw new BadRequestException('Invalid timestamp format');
      }

      // Check if timestamp is not too old (more than 24 hours)
      const now = new Date();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (now.getTime() - timestamp.getTime() > maxAge) {
        throw new BadRequestException('Data timestamp is too old');
      }

      // Validate specific data type payloads
      await this.validateDataTypePayload(data.dataType, data.data);

      return true;
    } catch (error) {
      this.logger.error('Agent data validation failed', error, {
        computerUid: data.computerUid,
        dataType: data.dataType,
      });
      throw error;
    }
  }

  async processMonitoringData(data: IAgentData): Promise<void> {
    try {
      this.logger.log('Processing monitoring data from queue', {
        computerUid: data.computerUid,
        dataType: data.dataType,
      });

      // Find or create computer user
      let computerUser = await this.computerUserRepository.findBySid(data.computerUserSid);
      if (!computerUser) {
        // Create placeholder computer user if not exists
        computerUser = await this.computerUserRepository.create({
          sid: data.computerUserSid,
          name: 'Unknown User',
          username: 'unknown',
          isAdmin: false,
          isInDomain: false,
          isActive: true,
        });
      }

      // Find or create computer
      let computer = await this.computerRepository.findByUid(data.computerUid);
      if (!computer) {
        computer = await this.computerRepository.create({
          computerUid: data.computerUid,
          isActive: true,
        });
      }

      // Ensure user-computer association
      await this.ensureUserComputerAssociation(computerUser.id, computer.id);

      // Get users_on_computers ID (simplified - using computerUser.id)
      const usersOnComputersId = computerUser.id;

      // Process specific data type
      await this.processSpecificDataType(data, usersOnComputersId);

      this.logger.log('Successfully processed monitoring data', {
        computerUid: data.computerUid,
        dataType: data.dataType,
        usersOnComputersId,
      });
    } catch (error) {
      this.logger.error('Failed to process monitoring data', error, {
        computerUid: data.computerUid,
        dataType: data.dataType,
      });
      throw error;
    }
  }

  private async validateDataTypePayload(dataType: string, payload: any): Promise<void> {
    switch (dataType) {
      case 'active-window':
        this.validateActiveWindowPayload(payload);
        break;
      case 'visited-site':
        this.validateVisitedSitePayload(payload);
        break;
      case 'screenshot':
        this.validateScreenshotPayload(payload);
        break;
      case 'session':
        this.validateSessionPayload(payload);
        break;
      default:
        throw new BadRequestException(`Unknown data type: ${dataType}`);
    }
  }

  private validateActiveWindowPayload(payload: any): void {
    if (!payload.title || typeof payload.title !== 'string') {
      throw new BadRequestException('Active window title is required and must be a string');
    }

    if (!payload.processName || typeof payload.processName !== 'string') {
      throw new BadRequestException('Process name is required and must be a string');
    }

    if (typeof payload.activeTime !== 'number' || payload.activeTime < 0) {
      throw new BadRequestException('Active time must be a non-negative number');
    }
  }

  private validateVisitedSitePayload(payload: any): void {
    if (!payload.url || typeof payload.url !== 'string') {
      throw new BadRequestException('URL is required and must be a string');
    }

    // Validate URL format
    try {
      new URL(payload.url);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    if (!payload.processName || typeof payload.processName !== 'string') {
      throw new BadRequestException('Process name is required and must be a string');
    }

    if (typeof payload.activeTime !== 'number' || payload.activeTime < 0) {
      throw new BadRequestException('Active time must be a non-negative number');
    }
  }

  private validateScreenshotPayload(payload: any): void {
    if (!payload.filePath || typeof payload.filePath !== 'string') {
      throw new BadRequestException('File path is required and must be a string');
    }

    if (!payload.processName || typeof payload.processName !== 'string') {
      throw new BadRequestException('Process name is required and must be a string');
    }
  }

  private validateSessionPayload(payload: any): void {
    if (!payload.startTime) {
      throw new BadRequestException('Session start time is required');
    }

    const startTime = new Date(payload.startTime);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid start time format');
    }

    if (payload.endTime) {
      const endTime = new Date(payload.endTime);
      if (isNaN(endTime.getTime())) {
        throw new BadRequestException('Invalid end time format');
      }

      if (endTime <= startTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    const validSessionTypes = ['UNLOCKED', 'LOCKED', 'LOGIN', 'LOGOUT'];
    if (!payload.sessionType || !validSessionTypes.includes(payload.sessionType)) {
      throw new BadRequestException(`Invalid session type. Must be one of: ${validSessionTypes.join(', ')}`);
    }
  }

  private validateRegistrationData(data: IComputerUserRegistration): void {
    if (!data.computerUid || typeof data.computerUid !== 'string') {
      throw new BadRequestException('Computer UID is required and must be a string');
    }

    if (!data.sid || typeof data.sid !== 'string') {
      throw new BadRequestException('SID is required and must be a string');
    }

    if (!data.name || typeof data.name !== 'string') {
      throw new BadRequestException('Name is required and must be a string');
    }

    if (!data.username || typeof data.username !== 'string') {
      throw new BadRequestException('Username is required and must be a string');
    }

    if (typeof data.isAdmin !== 'boolean') {
      throw new BadRequestException('isAdmin must be a boolean');
    }

    if (typeof data.isInDomain !== 'boolean') {
      throw new BadRequestException('isInDomain must be a boolean');
    }
  }

  private async processSpecificDataType(data: IAgentData, usersOnComputersId: number): Promise<void> {
    const timestamp = new Date(data.timestamp);

    switch (data.dataType) {
      case 'active-window':
        await this.monitoringRepository.createActiveWindow({
          usersOnComputersId,
          datetime: timestamp,
          title: (data.data as any).title,
          processName: (data.data as any).processName,
          icon: (data.data as any).icon,
          activeTime: (data.data as any).activeTime,
        });
        break;

      case 'visited-site':
        await this.monitoringRepository.createVisitedSite({
          usersOnComputersId,
          datetime: timestamp,
          title: (data.data as any).title,
          url: (data.data as any).url,
          processName: (data.data as any).processName,
          icon: (data.data as any).icon,
          activeTime: (data.data as any).activeTime,
        });
        break;

      case 'screenshot':
        await this.monitoringRepository.createScreenshot({
          usersOnComputersId,
          datetime: timestamp,
          title: (data.data as any).title,
          filePath: (data.data as any).filePath,
          processName: (data.data as any).processName,
          icon: (data.data as any).icon,
        });
        break;

      case 'session':
        await this.processSessionData(data.data as any, usersOnComputersId);
        break;
    }
  }

  private async processSessionData(sessionData: any, usersOnComputersId: number): Promise<void> {
    if (sessionData.endTime) {
      // Find and update existing session
      const existingSessions = await this.monitoringRepository.findUserSessions(
        { 
          computerUserId: usersOnComputersId,
          startDate: sessionData.startTime,
          endDate: sessionData.startTime
        },
        {}
      );
      
      if (existingSessions.length > 0) {
        await this.monitoringRepository.updateUserSession(existingSessions[0].id, {
          endTime: new Date(sessionData.endTime),
          sessionType: sessionData.sessionType,
        });
      } else {
        // Create session with end time
        await this.monitoringRepository.createUserSession({
          usersOnComputersId,
          startTime: new Date(sessionData.startTime),
          endTime: new Date(sessionData.endTime),
          sessionType: sessionData.sessionType,
        });
      }
    } else {
      // Create new session
      await this.monitoringRepository.createUserSession({
        usersOnComputersId,
        startTime: new Date(sessionData.startTime),
        sessionType: sessionData.sessionType,
      });
    }
  }

  private async ensureComputerExists(registrationData: IComputerUserRegistration): Promise<void> {
    let computer = await this.computerRepository.findByUid(registrationData.computerUid);
    
    if (!computer) {
      computer = await this.computerRepository.create({
        computerUid: registrationData.computerUid,
        os: registrationData.os,
        ipAddress: registrationData.ipAddress,
        macAddress: registrationData.macAddress,
        isActive: true,
      });

      this.logger.log('Created new computer during registration', {
        computerId: computer.id,
        computerUid: registrationData.computerUid,
      });
    } else {
      // Update computer information if provided
      const updateData: any = { isActive: true };
      
      if (registrationData.os) updateData.os = registrationData.os;
      if (registrationData.ipAddress) updateData.ipAddress = registrationData.ipAddress;
      if (registrationData.macAddress) updateData.macAddress = registrationData.macAddress;

      await this.computerRepository.update(computer.id, updateData);

      this.logger.log('Updated computer information during registration', {
        computerId: computer.id,
        computerUid: registrationData.computerUid,
      });
    }
  }

  private async ensureUserComputerAssociation(computerUserId: number, computerId: number): Promise<void> {
    try {
      await this.computerRepository.associateUser(computerId, computerUserId);
    } catch (error) {
      // Association might already exist
      this.logger.debug('User-computer association already exists or failed to create', {
        computerUserId,
        computerId,
        error: error.message,
      });
    }
  }

  private getDataPriority(dataType: string): number {
    // Higher priority for real-time data
    switch (dataType) {
      case 'session':
        return 10; // Highest priority
      case 'screenshot':
        return 5;
      case 'active-window':
        return 3;
      case 'visited-site':
        return 1;
      default:
        return 1;
    }
  }

  async authenticateAgent(computerUid: string, authToken?: string): Promise<boolean> {
    try {
      // Basic authentication - in production, implement proper agent authentication
      if (!computerUid) {
        throw new UnauthorizedException('Computer UID is required for authentication');
      }

      // Verify computer exists and is active
      const computer = await this.computerRepository.findByUid(computerUid);
      if (!computer || !computer.isActive) {
        throw new UnauthorizedException('Computer not found or inactive');
      }

      // Additional authentication logic can be added here
      // For example, checking auth tokens, certificates, etc.

      return true;
    } catch (error) {
      this.logger.error('Agent authentication failed', error, {
        computerUid,
      });
      throw error;
    }
  }

  async getAgentConfiguration(computerUid: string): Promise<any> {
    try {
      const computer = await this.computerRepository.findByUid(computerUid);
      if (!computer) {
        throw new BadRequestException('Computer not found');
      }

      // Get computer users for this computer
      const computerUsers = await this.computerRepository.findUsers(computer.id, {});

      // Get applicable policies for computer users
      const policies = [];
      for (const user of computerUsers) {
        if (user.employeeId) {
          // Get policies for this employee
          // This would involve querying policy assignments
        }
      }

      return {
        computerUid,
        monitoringEnabled: true,
        screenshotInterval: 300, // 5 minutes default
        dataSubmissionInterval: 60, // 1 minute
        policies,
        serverEndpoints: {
          dataSubmission: '/api/monitoring/agent-data',
          registration: '/api/monitoring/register-computer-user',
          configuration: '/api/monitoring/agent-config',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get agent configuration', error, {
        computerUid,
      });
      throw error;
    }
  }
}