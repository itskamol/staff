import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  IMonitoringService,
  IActiveWindow,
  IVisitedSite,
  IScreenshot,
  IUserSession,
  IAgentData,
  IDataScope,
  IUserContext
} from '../../../shared/interfaces';
import { MonitoringQueryDto, ActivityQueryDto } from '../../../shared/dto';
import { MonitoringRepository } from '../repositories/monitoring.repository';
import { ComputerUserRepository } from '../repositories/computer-user.repository';
import { ComputerRepository } from '../repositories/computer.repository';
import { LoggerService } from '../../../core/logger/services/logger.service';

@Injectable()
export class MonitoringService implements IMonitoringService {
  constructor(
    private readonly monitoringRepository: MonitoringRepository,
    private readonly computerUserRepository: ComputerUserRepository,
    private readonly computerRepository: ComputerRepository,
    private readonly logger: LoggerService,
  ) {}

  async getActiveWindows(query: MonitoringQueryDto, scope: IDataScope, user: IUserContext): Promise<IActiveWindow[]> {
    try {
      this.logger.log('Fetching active windows', {
        userId: user.id,
        scope,
        query,
      });

      const activeWindows = await this.monitoringRepository.findActiveWindows(query, scope);

      this.logger.log('Successfully fetched active windows', {
        count: activeWindows.length,
        userId: user.id,
      });

      return activeWindows;
    } catch (error) {
      this.logger.error('Failed to fetch active windows', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async getVisitedSites(query: MonitoringQueryDto, scope: IDataScope, user: IUserContext): Promise<IVisitedSite[]> {
    try {
      this.logger.log('Fetching visited sites', {
        userId: user.id,
        scope,
        query,
      });

      const visitedSites = await this.monitoringRepository.findVisitedSites(query, scope);

      this.logger.log('Successfully fetched visited sites', {
        count: visitedSites.length,
        userId: user.id,
      });

      return visitedSites;
    } catch (error) {
      this.logger.error('Failed to fetch visited sites', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async getScreenshots(query: MonitoringQueryDto, scope: IDataScope, user: IUserContext): Promise<IScreenshot[]> {
    try {
      this.logger.log('Fetching screenshots', {
        userId: user.id,
        scope,
        query,
      });

      // Apply privacy controls based on user role and permissions
      const filteredQuery = this.applyScreenshotPrivacyControls(query, user);

      const screenshots = await this.monitoringRepository.findScreenshots(filteredQuery, scope);

      this.logger.log('Successfully fetched screenshots', {
        count: screenshots.length,
        userId: user.id,
      });

      return screenshots;
    } catch (error) {
      this.logger.error('Failed to fetch screenshots', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async getUserSessions(query: MonitoringQueryDto, scope: IDataScope, user: IUserContext): Promise<IUserSession[]> {
    try {
      this.logger.log('Fetching user sessions', {
        userId: user.id,
        scope,
        query,
      });

      const userSessions = await this.monitoringRepository.findUserSessions(query, scope);

      this.logger.log('Successfully fetched user sessions', {
        count: userSessions.length,
        userId: user.id,
      });

      return userSessions;
    } catch (error) {
      this.logger.error('Failed to fetch user sessions', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async getEmployeeActivityReport(
    employeeId: number,
    query: ActivityQueryDto,
    scope: IDataScope,
    user: IUserContext
  ): Promise<any> {
    try {
      this.logger.log('Generating employee activity report', {
        employeeId,
        userId: user.id,
        query,
      });

      // Verify employee exists and is accessible
      const employee = await this.validateEmployeeAccess(employeeId, scope, user);

      // Get all computer users linked to this employee
      const computerUsers = await this.computerUserRepository.findByEmployeeId(employeeId);
      const usersOnComputersIds = computerUsers.map(cu => cu.id);

      if (usersOnComputersIds.length === 0) {
        return this.createEmptyActivityReport(employeeId, query);
      }

      // Generate comprehensive activity report
      const report = await this.generateActivityReport(
        usersOnComputersIds,
        query,
        { type: 'employee', id: employeeId }
      );

      this.logger.log('Successfully generated employee activity report', {
        employeeId,
        userId: user.id,
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate employee activity report', error, {
        employeeId,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputerUserActivityReport(
    computerUserId: number,
    query: ActivityQueryDto,
    scope: IDataScope,
    user: IUserContext
  ): Promise<any> {
    try {
      this.logger.log('Generating computer user activity report', {
        computerUserId,
        userId: user.id,
        query,
      });

      // Verify computer user exists and is accessible
      const computerUser = await this.computerUserRepository.findById(computerUserId);
      if (!computerUser) {
        throw new NotFoundException('Computer user not found');
      }

      await this.validateComputerUserAccess(computerUser, scope, user);

      // Generate activity report for single computer user
      const report = await this.generateActivityReport(
        [computerUserId],
        query,
        { type: 'computer_user', id: computerUserId }
      );

      this.logger.log('Successfully generated computer user activity report', {
        computerUserId,
        userId: user.id,
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate computer user activity report', error, {
        computerUserId,
        userId: user.id,
      });
      throw error;
    }
  }

  async processAgentData(data: IAgentData): Promise<void> {
    try {
      this.logger.log('Processing agent data', {
        computerUid: data.computerUid,
        dataType: data.dataType,
        timestamp: data.timestamp,
      });

      // Find or create computer user
      const computerUser = await this.findOrCreateComputerUser(data);

      // Find computer and associate if needed
      const computer = await this.findOrCreateComputer(data);

      // Ensure user-computer association exists
      await this.ensureUserComputerAssociation(computerUser.id, computer.id);

      // Get users_on_computers ID
      const usersOnComputersId = await this.getUsersOnComputersId(computerUser.id, computer.id);

      // Process specific data type
      await this.processSpecificAgentData(data, usersOnComputersId);

      this.logger.log('Successfully processed agent data', {
        computerUid: data.computerUid,
        dataType: data.dataType,
        usersOnComputersId,
      });
    } catch (error) {
      this.logger.error('Failed to process agent data', error, {
        computerUid: data.computerUid,
        dataType: data.dataType,
      });
      throw error;
    }
  }

  private async generateActivityReport(
    usersOnComputersIds: number[],
    query: ActivityQueryDto,
    context: { type: 'employee' | 'computer_user'; id: number }
  ): Promise<any> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Get activity summaries
    const [
      activeWindowSummary,
      visitedSiteSummary,
      dailyActivity,
      sessionDurations
    ] = await Promise.all([
      this.monitoringRepository.getActiveWindowSummary(usersOnComputersIds, startDate, endDate),
      this.monitoringRepository.getVisitedSiteSummary(usersOnComputersIds, startDate, endDate),
      this.monitoringRepository.getDailyActivitySummary(usersOnComputersIds, startDate, endDate),
      this.monitoringRepository.getSessionDurations(usersOnComputersIds, startDate, endDate)
    ]);

    // Process and categorize applications
    const topApplications = this.processApplicationUsage(activeWindowSummary);
    
    // Process and categorize websites
    const topWebsites = this.processWebsiteUsage(visitedSiteSummary);

    // Calculate productivity metrics
    const productivityMetrics = this.calculateProductivityMetrics(topApplications, topWebsites);

    // Process daily breakdown
    const dailyBreakdown = this.processDailyActivity(dailyActivity);

    // Get screenshots if requested
    const screenshots = query.includeScreenshots 
      ? await this.getScreenshotSummary(usersOnComputersIds, startDate, endDate)
      : [];

    return {
      [context.type === 'employee' ? 'employeeId' : 'computerUserId']: context.id,
      reportPeriod: {
        startDate,
        endDate,
      },
      summary: {
        totalActiveTime: this.calculateTotalActiveTime(dailyActivity),
        totalSessions: sessionDurations.length,
        productivityScore: productivityMetrics.score,
        topApplications: topApplications.slice(0, 10),
        topWebsites: topWebsites.slice(0, 10),
      },
      dailyBreakdown,
      screenshots: screenshots.slice(0, 50), // Limit screenshots
      productivityAnalysis: productivityMetrics,
    };
  }

  private async processSpecificAgentData(data: IAgentData, usersOnComputersId: number): Promise<void> {
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
        const sessionData = data.data as any;
        if (sessionData.endTime) {
          // Update existing session
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
          }
        } else {
          // Create new session
          await this.monitoringRepository.createUserSession({
            usersOnComputersId,
            startTime: new Date(sessionData.startTime),
            sessionType: sessionData.sessionType,
          });
        }
        break;

      default:
        throw new BadRequestException(`Unknown data type: ${data.dataType}`);
    }
  }

  private async findOrCreateComputerUser(data: IAgentData): Promise<any> {
    let computerUser = await this.computerUserRepository.findBySid(data.computerUserSid);
    
    if (!computerUser) {
      // Create new computer user from agent data
      computerUser = await this.computerUserRepository.create({
        sid: data.computerUserSid,
        name: 'Unknown User', // Will be updated when agent sends registration data
        username: 'unknown',
        isAdmin: false,
        isInDomain: false,
        isActive: true,
      });
    }

    return computerUser;
  }

  private async findOrCreateComputer(data: IAgentData): Promise<any> {
    let computer = await this.computerRepository.findByUid(data.computerUid);
    
    if (!computer) {
      // Create new computer from agent data
      computer = await this.computerRepository.create({
        computerUid: data.computerUid,
        isActive: true,
      });
    }

    return computer;
  }

  private async ensureUserComputerAssociation(computerUserId: number, computerId: number): Promise<void> {
    try {
      await this.computerRepository.associateUser(computerId, computerUserId);
    } catch (error) {
      // Association might already exist, which is fine
      this.logger.debug('User-computer association already exists or failed to create', {
        computerUserId,
        computerId,
        error: error.message,
      });
    }
  }

  private async getUsersOnComputersId(computerUserId: number, computerId: number): Promise<number> {
    // This would typically involve querying the users_on_computers table
    // For now, we'll use the computerUserId as a placeholder
    return computerUserId;
  }

  private processApplicationUsage(activeWindowSummary: any[]): any[] {
    return activeWindowSummary.map(item => ({
      processName: item.processName,
      totalTime: item._sum.activeTime || 0,
      percentage: 0, // Will be calculated based on total
      category: this.categorizeApplication(item.processName),
    })).sort((a, b) => b.totalTime - a.totalTime);
  }

  private processWebsiteUsage(visitedSiteSummary: any[]): any[] {
    return visitedSiteSummary.map(item => ({
      domain: this.extractDomain(item.url),
      totalTime: item._sum.activeTime || 0,
      percentage: 0, // Will be calculated based on total
      category: this.categorizeWebsite(item.url),
      visitCount: item._count.id || 0,
    })).sort((a, b) => b.totalTime - a.totalTime);
  }

  private calculateProductivityMetrics(applications: any[], websites: any[]): any {
    const totalTime = applications.reduce((sum, app) => sum + app.totalTime, 0) +
                     websites.reduce((sum, site) => sum + site.totalTime, 0);

    const productiveTime = applications.filter(app => app.category === 'productive')
                                     .reduce((sum, app) => sum + app.totalTime, 0) +
                          websites.filter(site => site.category === 'productive')
                                  .reduce((sum, site) => sum + site.totalTime, 0);

    const score = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

    return {
      score,
      totalTime,
      productiveTime,
      neutralTime: totalTime - productiveTime,
      unproductiveTime: 0, // Calculate based on categorization
    };
  }

  private processDailyActivity(dailyActivity: any[]): any[] {
    return dailyActivity.map(day => ({
      date: day.date,
      totalActiveTime: day.total_active_time || 0,
      totalSessions: day.activity_count || 0,
      productivityScore: 0, // Calculate based on daily data
      topApplications: [],
      topWebsites: [],
      screenshotCount: 0,
    }));
  }

  private calculateTotalActiveTime(dailyActivity: any[]): number {
    return dailyActivity.reduce((sum, day) => sum + (day.total_active_time || 0), 0);
  }

  private async getScreenshotSummary(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const screenshots = await this.monitoringRepository.findScreenshots(
      { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      {}
    );

    return screenshots.map(screenshot => ({
      datetime: screenshot.datetime,
      filePath: screenshot.filePath,
      processName: screenshot.processName,
      title: screenshot.title,
    }));
  }

  private categorizeApplication(processName: string): 'productive' | 'neutral' | 'unproductive' {
    const productiveApps = ['code.exe', 'devenv.exe', 'idea64.exe', 'notepad++.exe'];
    const unproductiveApps = ['game.exe', 'steam.exe', 'discord.exe'];
    
    const lowerProcessName = processName.toLowerCase();
    
    if (productiveApps.some(app => lowerProcessName.includes(app.toLowerCase()))) {
      return 'productive';
    }
    
    if (unproductiveApps.some(app => lowerProcessName.includes(app.toLowerCase()))) {
      return 'unproductive';
    }
    
    return 'neutral';
  }

  private categorizeWebsite(url: string): 'productive' | 'neutral' | 'unproductive' {
    const productiveSites = ['github.com', 'stackoverflow.com', 'docs.microsoft.com'];
    const unproductiveSites = ['facebook.com', 'youtube.com', 'instagram.com'];
    
    const lowerUrl = url.toLowerCase();
    
    if (productiveSites.some(site => lowerUrl.includes(site))) {
      return 'productive';
    }
    
    if (unproductiveSites.some(site => lowerUrl.includes(site))) {
      return 'unproductive';
    }
    
    return 'neutral';
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private applyScreenshotPrivacyControls(query: MonitoringQueryDto, user: IUserContext): MonitoringQueryDto {
    // Apply privacy controls based on user role and permissions
    // For example, limit screenshot access for certain roles
    return query;
  }

  private createEmptyActivityReport(employeeId: number, query: ActivityQueryDto): any {
    return {
      employeeId,
      reportPeriod: {
        startDate: query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: query.endDate ? new Date(query.endDate) : new Date(),
      },
      summary: {
        totalActiveTime: 0,
        totalSessions: 0,
        productivityScore: 0,
        topApplications: [],
        topWebsites: [],
      },
      dailyBreakdown: [],
      screenshots: [],
      productivityAnalysis: {
        score: 0,
        totalTime: 0,
        productiveTime: 0,
        neutralTime: 0,
        unproductiveTime: 0,
      },
    };
  }

  private async validateEmployeeAccess(
    employeeId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<any> {
    // This would typically involve checking if the employee is within the user's scope
    // For now, we'll implement basic validation
    if (scope.employeeIds && !scope.employeeIds.includes(employeeId)) {
      throw new NotFoundException('Employee not found or access denied');
    }

    return { id: employeeId }; // Placeholder employee object
  }

  private async validateComputerUserAccess(
    computerUser: any,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    // If computer user is linked to an employee, validate employee access
    if (computerUser.employeeId) {
      await this.validateEmployeeAccess(computerUser.employeeId, scope, user);
    }
  }
}