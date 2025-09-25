import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { 
  IDataScope,
  IUserContext,
  IApplicationUsage,
  IWebsiteUsage,
  IActivityMetrics
} from '../../../shared/interfaces';
import { ActivityQueryDto } from '../../../shared/dto';
import { MonitoringRepository } from '../repositories/monitoring.repository';
import { ComputerUserRepository } from '../repositories/computer-user.repository';
import { LoggerService } from '../../../core/logger/services/logger.service';

@Injectable()
export class ActivityReportService {
  constructor(
    private readonly monitoringRepository: MonitoringRepository,
    private readonly computerUserRepository: ComputerUserRepository,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async generateEmployeeActivityReport(
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

      // Check cache first
      const cacheKey = this.generateCacheKey('employee', employeeId, query);
      const cachedReport = await this.cacheManager.get(cacheKey);
      if (cachedReport) {
        this.logger.log('Returning cached employee activity report', { employeeId });
        return cachedReport;
      }

      // Validate employee access
      await this.validateEmployeeAccess(employeeId, scope, user);

      // Get computer users linked to employee
      const computerUsers = await this.computerUserRepository.findByEmployeeId(employeeId);
      if (computerUsers.length === 0) {
        return this.createEmptyReport('employee', employeeId, query);
      }

      const usersOnComputersIds = computerUsers.map(cu => cu.id);

      // Generate comprehensive report
      const report = await this.generateComprehensiveReport(
        usersOnComputersIds,
        query,
        { type: 'employee', id: employeeId, name: 'Employee' }
      );

      // Cache the report
      await this.cacheManager.set(cacheKey, report, 300000); // 5 minutes

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

  async generateComputerUserActivityReport(
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

      // Check cache first
      const cacheKey = this.generateCacheKey('computer_user', computerUserId, query);
      const cachedReport = await this.cacheManager.get(cacheKey);
      if (cachedReport) {
        this.logger.log('Returning cached computer user activity report', { computerUserId });
        return cachedReport;
      }

      // Validate computer user access
      const computerUser = await this.computerUserRepository.findById(computerUserId);
      if (!computerUser) {
        throw new NotFoundException('Computer user not found');
      }

      await this.validateComputerUserAccess(computerUser, scope, user);

      // Generate report for single computer user
      const report = await this.generateComprehensiveReport(
        [computerUserId],
        query,
        { type: 'computer_user', id: computerUserId, name: computerUser.name }
      );

      // Cache the report
      await this.cacheManager.set(cacheKey, report, 300000); // 5 minutes

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

  async generateDepartmentActivityReport(
    departmentId: number,
    query: ActivityQueryDto,
    scope: IDataScope,
    user: IUserContext
  ): Promise<any> {
    try {
      this.logger.log('Generating department activity report', {
        departmentId,
        userId: user.id,
        query,
      });

      // Get all computer users in department
      const computerUsers = await this.computerUserRepository.findAll(
        { limit: 1000 },
        { departmentId }
      );

      if (computerUsers.length === 0) {
        return this.createEmptyReport('department', departmentId, query);
      }

      const usersOnComputersIds = computerUsers.map(cu => cu.id);

      // Generate aggregated department report
      const report = await this.generateComprehensiveReport(
        usersOnComputersIds,
        query,
        { type: 'department', id: departmentId, name: 'Department' }
      );

      // Add department-specific metrics
      report.departmentMetrics = {
        totalEmployees: computerUsers.length,
        activeEmployees: computerUsers.filter(cu => cu.isActive).length,
        averageProductivityScore: this.calculateAverageProductivity(report.summary.productivityScore),
        topPerformers: await this.getTopPerformers(usersOnComputersIds, query),
      };

      this.logger.log('Successfully generated department activity report', {
        departmentId,
        userId: user.id,
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate department activity report', error, {
        departmentId,
        userId: user.id,
      });
      throw error;
    }
  }

  private async generateComprehensiveReport(
    usersOnComputersIds: number[],
    query: ActivityQueryDto,
    context: { type: string; id: number; name: string }
  ): Promise<any> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Parallel data fetching for performance
    const [
      activeWindowSummary,
      visitedSiteSummary,
      dailyActivity,
      sessionDurations,
      screenshots
    ] = await Promise.all([
      this.monitoringRepository.getActiveWindowSummary(usersOnComputersIds, startDate, endDate),
      this.monitoringRepository.getVisitedSiteSummary(usersOnComputersIds, startDate, endDate),
      this.monitoringRepository.getDailyActivitySummary(usersOnComputersIds, startDate, endDate),
      this.monitoringRepository.getSessionDurations(usersOnComputersIds, startDate, endDate),
      query.includeScreenshots 
        ? this.getScreenshotSummary(usersOnComputersIds, startDate, endDate)
        : Promise.resolve([])
    ]);

    // Process and analyze data
    const applicationUsage = this.processApplicationUsage(activeWindowSummary);
    const websiteUsage = this.processWebsiteUsage(visitedSiteSummary);
    const productivityMetrics = this.calculateProductivityMetrics(applicationUsage, websiteUsage);
    const dailyBreakdown = this.processDailyActivity(dailyActivity);
    const sessionAnalysis = this.analyzeUserSessions(sessionDurations);

    // Calculate advanced metrics
    const advancedMetrics = await this.calculateAdvancedMetrics(
      usersOnComputersIds,
      startDate,
      endDate,
      applicationUsage,
      websiteUsage
    );

    return {
      [context.type === 'employee' ? 'employeeId' : 
       context.type === 'computer_user' ? 'computerUserId' : 
       context.type + 'Id']: context.id,
      reportPeriod: {
        startDate,
        endDate,
        totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        workingDays: this.calculateWorkingDays(startDate, endDate),
      },
      summary: {
        totalActiveTime: this.calculateTotalActiveTime(dailyActivity),
        totalSessions: sessionDurations.length,
        productivityScore: productivityMetrics.score,
        averageSessionDuration: sessionAnalysis.averageDuration,
        topApplications: applicationUsage.slice(0, 10),
        topWebsites: websiteUsage.slice(0, 10),
      },
      dailyBreakdown,
      applicationAnalysis: {
        totalApplications: applicationUsage.length,
        productiveApplications: applicationUsage.filter(app => app.category === 'productive').length,
        topProductiveApps: applicationUsage.filter(app => app.category === 'productive').slice(0, 5),
        topUnproductiveApps: applicationUsage.filter(app => app.category === 'unproductive').slice(0, 5),
      },
      websiteAnalysis: {
        totalWebsites: websiteUsage.length,
        productiveWebsites: websiteUsage.filter(site => site.category === 'productive').length,
        topProductiveSites: websiteUsage.filter(site => site.category === 'productive').slice(0, 5),
        topUnproductiveSites: websiteUsage.filter(site => site.category === 'unproductive').slice(0, 5),
      },
      sessionAnalysis,
      productivityAnalysis: {
        ...productivityMetrics,
        trends: advancedMetrics.productivityTrends,
        patterns: advancedMetrics.usagePatterns,
      },
      screenshots: screenshots.slice(0, query.includeScreenshots ? 100 : 0),
      generatedAt: new Date(),
      cacheExpiry: new Date(Date.now() + 300000), // 5 minutes
    };
  }

  private processApplicationUsage(activeWindowSummary: any[]): IApplicationUsage[] {
    const totalTime = activeWindowSummary.reduce((sum, item) => sum + (item._sum.activeTime || 0), 0);

    return activeWindowSummary.map(item => {
      const activeTime = item._sum.activeTime || 0;
      return {
        processName: item.processName,
        totalTime: activeTime,
        percentage: totalTime > 0 ? Math.round((activeTime / totalTime) * 100 * 100) / 100 : 0,
        category: this.categorizeApplication(item.processName),
      };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }

  private processWebsiteUsage(visitedSiteSummary: any[]): IWebsiteUsage[] {
    const totalTime = visitedSiteSummary.reduce((sum, item) => sum + (item._sum.activeTime || 0), 0);

    return visitedSiteSummary.map(item => {
      const activeTime = item._sum.activeTime || 0;
      const domain = this.extractDomain(item.url);
      return {
        domain,
        totalTime: activeTime,
        percentage: totalTime > 0 ? Math.round((activeTime / totalTime) * 100 * 100) / 100 : 0,
        category: this.categorizeWebsite(item.url),
        visitCount: item._count.id || 0,
      };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }

  private calculateProductivityMetrics(
    applications: IApplicationUsage[],
    websites: IWebsiteUsage[]
  ): IActivityMetrics {
    const totalAppTime = applications.reduce((sum, app) => sum + app.totalTime, 0);
    const totalWebTime = websites.reduce((sum, site) => sum + site.totalTime, 0);
    const totalTime = totalAppTime + totalWebTime;

    const productiveAppTime = applications
      .filter(app => app.category === 'productive')
      .reduce((sum, app) => sum + app.totalTime, 0);

    const productiveWebTime = websites
      .filter(site => site.category === 'productive')
      .reduce((sum, site) => sum + site.totalTime, 0);

    const neutralAppTime = applications
      .filter(app => app.category === 'neutral')
      .reduce((sum, app) => sum + app.totalTime, 0);

    const neutralWebTime = websites
      .filter(site => site.category === 'neutral')
      .reduce((sum, site) => sum + site.totalTime, 0);

    const unproductiveAppTime = applications
      .filter(app => app.category === 'unproductive')
      .reduce((sum, app) => sum + app.totalTime, 0);

    const unproductiveWebTime = websites
      .filter(site => site.category === 'unproductive')
      .reduce((sum, site) => sum + site.totalTime, 0);

    const productiveTime = productiveAppTime + productiveWebTime;
    const neutralTime = neutralAppTime + neutralWebTime;
    const unproductiveTime = unproductiveAppTime + unproductiveWebTime;

    const score = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

    return {
      totalActiveTime: totalTime,
      productivityScore: score,
      applicationUsage: applications,
      websiteUsage: websites,
      breakdown: {
        productiveTime,
        neutralTime,
        unproductiveTime,
        productivePercentage: totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0,
        neutralPercentage: totalTime > 0 ? Math.round((neutralTime / totalTime) * 100) : 0,
        unproductivePercentage: totalTime > 0 ? Math.round((unproductiveTime / totalTime) * 100) : 0,
      },
    };
  }

  private processDailyActivity(dailyActivity: any[]): any[] {
    return dailyActivity.map(day => {
      const totalActiveTime = day.total_active_time || 0;
      const activityCount = day.activity_count || 0;

      return {
        date: day.date,
        totalActiveTime,
        totalSessions: activityCount,
        productivityScore: this.calculateDailyProductivityScore(day),
        workHours: Math.round((totalActiveTime / 3600) * 100) / 100, // Convert to hours
        efficiency: activityCount > 0 ? Math.round((totalActiveTime / activityCount) * 100) / 100 : 0,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private analyzeUserSessions(sessionDurations: any[]): any {
    if (sessionDurations.length === 0) {
      return {
        totalSessions: 0,
        averageDuration: 0,
        longestSession: 0,
        shortestSession: 0,
        sessionTypes: {},
      };
    }

    const durations = sessionDurations.map(session => {
      if (session.endTime && session.startTime) {
        return new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      }
      return 0;
    }).filter(duration => duration > 0);

    const sessionTypes = sessionDurations.reduce((acc, session) => {
      acc[session.sessionType] = (acc[session.sessionType] || 0) + 1;
      return acc;
    }, {});

    return {
      totalSessions: sessionDurations.length,
      averageDuration: durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0,
      longestSession: durations.length > 0 ? Math.max(...durations) : 0,
      shortestSession: durations.length > 0 ? Math.min(...durations) : 0,
      sessionTypes,
      validSessions: durations.length,
    };
  }

  private async calculateAdvancedMetrics(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date,
    applications: IApplicationUsage[],
    websites: IWebsiteUsage[]
  ): Promise<any> {
    // Calculate productivity trends over time
    const productivityTrends = await this.calculateProductivityTrends(
      usersOnComputersIds,
      startDate,
      endDate
    );

    // Identify usage patterns
    const usagePatterns = this.identifyUsagePatterns(applications, websites);

    // Calculate focus metrics
    const focusMetrics = this.calculateFocusMetrics(applications);

    return {
      productivityTrends,
      usagePatterns,
      focusMetrics,
    };
  }

  private async calculateProductivityTrends(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // This would involve more complex queries to get weekly/daily trends
    // For now, return a simplified structure
    const trends = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekCount = Math.ceil(daysDiff / 7);

    for (let week = 0; week < weekCount; week++) {
      const weekStart = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Math.min(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000, endDate.getTime()));

      trends.push({
        period: `Week ${week + 1}`,
        startDate: weekStart,
        endDate: weekEnd,
        productivityScore: Math.floor(Math.random() * 40) + 60, // Placeholder
        totalActiveTime: Math.floor(Math.random() * 100000) + 50000, // Placeholder
      });
    }

    return trends;
  }

  private identifyUsagePatterns(applications: IApplicationUsage[], websites: IWebsiteUsage[]): any {
    const topApps = applications.slice(0, 5);
    const topSites = websites.slice(0, 5);

    return {
      primaryWorkTools: topApps.filter(app => app.category === 'productive'),
      distractionSources: [
        ...topApps.filter(app => app.category === 'unproductive'),
        ...topSites.filter(site => site.category === 'unproductive')
      ],
      multitaskingLevel: this.calculateMultitaskingLevel(applications),
      focusAreas: this.identifyFocusAreas(applications, websites),
    };
  }

  private calculateFocusMetrics(applications: IApplicationUsage[]): any {
    const totalApps = applications.length;
    const top5AppsTime = applications.slice(0, 5).reduce((sum, app) => sum + app.totalTime, 0);
    const totalTime = applications.reduce((sum, app) => sum + app.totalTime, 0);

    return {
      focusScore: totalTime > 0 ? Math.round((top5AppsTime / totalTime) * 100) : 0,
      applicationSwitching: totalApps,
      concentrationLevel: this.calculateConcentrationLevel(applications),
    };
  }

  private calculateMultitaskingLevel(applications: IApplicationUsage[]): 'Low' | 'Medium' | 'High' {
    const activeApps = applications.filter(app => app.totalTime > 300); // More than 5 minutes
    
    if (activeApps.length <= 3) return 'Low';
    if (activeApps.length <= 7) return 'Medium';
    return 'High';
  }

  private identifyFocusAreas(applications: IApplicationUsage[], websites: IWebsiteUsage[]): string[] {
    const focusAreas = [];

    // Identify based on application categories
    const devApps = applications.filter(app => 
      app.processName.toLowerCase().includes('code') ||
      app.processName.toLowerCase().includes('visual') ||
      app.processName.toLowerCase().includes('idea')
    );

    if (devApps.length > 0) focusAreas.push('Software Development');

    const designApps = applications.filter(app =>
      app.processName.toLowerCase().includes('photoshop') ||
      app.processName.toLowerCase().includes('illustrator') ||
      app.processName.toLowerCase().includes('figma')
    );

    if (designApps.length > 0) focusAreas.push('Design');

    // Add more focus area identification logic

    return focusAreas;
  }

  private calculateConcentrationLevel(applications: IApplicationUsage[]): number {
    if (applications.length === 0) return 0;

    const topApp = applications[0];
    const totalTime = applications.reduce((sum, app) => sum + app.totalTime, 0);

    return totalTime > 0 ? Math.round((topApp.totalTime / totalTime) * 100) : 0;
  }

  private categorizeApplication(processName: string): 'productive' | 'neutral' | 'unproductive' {
    const productiveApps = [
      'code.exe', 'devenv.exe', 'idea64.exe', 'notepad++.exe', 'sublime_text.exe',
      'atom.exe', 'webstorm64.exe', 'phpstorm64.exe', 'pycharm64.exe',
      'excel.exe', 'winword.exe', 'powerpnt.exe', 'outlook.exe',
      'slack.exe', 'teams.exe', 'zoom.exe', 'skype.exe'
    ];

    const unproductiveApps = [
      'steam.exe', 'discord.exe', 'spotify.exe', 'vlc.exe',
      'game.exe', 'launcher.exe', 'epicgameslauncher.exe'
    ];

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
    const productiveSites = [
      'github.com', 'stackoverflow.com', 'docs.microsoft.com', 'developer.mozilla.org',
      'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
      'linkedin.com', 'coursera.org', 'udemy.com', 'pluralsight.com'
    ];

    const unproductiveSites = [
      'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
      'youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com'
    ];

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

  private calculateTotalActiveTime(dailyActivity: any[]): number {
    return dailyActivity.reduce((sum, day) => sum + (day.total_active_time || 0), 0);
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  private calculateDailyProductivityScore(dayData: any): number {
    // Simplified productivity calculation for daily data
    const activeTime = dayData.total_active_time || 0;
    const activityCount = dayData.activity_count || 0;

    if (activeTime === 0) return 0;

    // Basic heuristic: more consistent activity = higher productivity
    const consistency = activityCount > 0 ? Math.min(activeTime / activityCount, 3600) / 3600 : 0;
    return Math.round(consistency * 100);
  }

  private calculateAverageProductivity(score: number): number {
    return Math.round(score * 100) / 100;
  }

  private async getTopPerformers(usersOnComputersIds: number[], query: ActivityQueryDto): Promise<any[]> {
    // This would involve more complex queries to rank users by productivity
    // For now, return a simplified structure
    return [];
  }

  private async getScreenshotSummary(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const screenshots = await this.monitoringRepository.findScreenshots(
      { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      },
      {}
    );

    return screenshots.map(screenshot => ({
      datetime: screenshot.datetime,
      filePath: screenshot.filePath,
      processName: screenshot.processName,
      title: screenshot.title,
    }));
  }

  private generateCacheKey(type: string, id: number, query: ActivityQueryDto): string {
    const queryHash = Buffer.from(JSON.stringify(query)).toString('base64');
    return `activity_report:${type}:${id}:${queryHash}`;
  }

  private createEmptyReport(type: string, id: number, query: ActivityQueryDto): any {
    return {
      [type === 'employee' ? 'employeeId' : type + 'Id']: id,
      reportPeriod: {
        startDate: query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: query.endDate ? new Date(query.endDate) : new Date(),
        totalDays: 0,
        workingDays: 0,
      },
      summary: {
        totalActiveTime: 0,
        totalSessions: 0,
        productivityScore: 0,
        averageSessionDuration: 0,
        topApplications: [],
        topWebsites: [],
      },
      dailyBreakdown: [],
      applicationAnalysis: {
        totalApplications: 0,
        productiveApplications: 0,
        topProductiveApps: [],
        topUnproductiveApps: [],
      },
      websiteAnalysis: {
        totalWebsites: 0,
        productiveWebsites: 0,
        topProductiveSites: [],
        topUnproductiveSites: [],
      },
      sessionAnalysis: {
        totalSessions: 0,
        averageDuration: 0,
        longestSession: 0,
        shortestSession: 0,
        sessionTypes: {},
      },
      productivityAnalysis: {
        totalActiveTime: 0,
        productivityScore: 0,
        applicationUsage: [],
        websiteUsage: [],
      },
      screenshots: [],
      generatedAt: new Date(),
    };
  }

  private async validateEmployeeAccess(
    employeeId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    if (scope.employeeIds && !scope.employeeIds.includes(employeeId)) {
      throw new NotFoundException('Employee not found or access denied');
    }
  }

  private async validateComputerUserAccess(
    computerUser: any,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    if (computerUser.employeeId) {
      await this.validateEmployeeAccess(computerUser.employeeId, scope, user);
    }
  }
}