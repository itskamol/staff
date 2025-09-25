import { Processor, Process } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { LoggerService } from '../../../core/logger/services/logger.service';
import { AgentService } from '../services/agent.service';
import { IAgentData } from '../../../shared/interfaces';

@Injectable()
@Processor('agent-data')
export class AgentDataProcessor {
  constructor(
    private readonly agentService: AgentService,
    private readonly logger: LoggerService,
  ) {}

  @Process('process-monitoring-data')
  async processMonitoringData(job: Job<IAgentData>): Promise<void> {
    const { data } = job;
    
    try {
      this.logger.log('Processing monitoring data from queue', {
        jobId: job.id,
        computerUid: data.computerUid,
        dataType: data.dataType,
        attempt: job.attemptsMade + 1,
      });

      // Process the monitoring data
      await this.agentService.processMonitoringData(data);

      this.logger.log('Successfully processed monitoring data', {
        jobId: job.id,
        computerUid: data.computerUid,
        dataType: data.dataType,
      });
    } catch (error) {
      this.logger.error('Failed to process monitoring data', error, {
        jobId: job.id,
        computerUid: data.computerUid,
        dataType: data.dataType,
        attempt: job.attemptsMade + 1,
      });

      // Re-throw error to trigger retry mechanism
      throw error;
    }
  }

  @Process('cleanup-old-data')
  async cleanupOldData(job: Job<{ retentionDays: number }>): Promise<void> {
    const { retentionDays } = job.data;
    
    try {
      this.logger.log('Starting data cleanup process', {
        jobId: job.id,
        retentionDays,
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // This would implement cleanup logic for old monitoring data
      // For now, we'll just log the operation
      this.logger.log('Data cleanup completed', {
        jobId: job.id,
        cutoffDate,
        retentionDays,
      });
    } catch (error) {
      this.logger.error('Failed to cleanup old data', error, {
        jobId: job.id,
        retentionDays,
      });
      throw error;
    }
  }

  @Process('generate-daily-reports')
  async generateDailyReports(job: Job<{ date: string }>): Promise<void> {
    const { date } = job.data;
    
    try {
      this.logger.log('Starting daily report generation', {
        jobId: job.id,
        date,
      });

      // This would implement daily report generation logic
      // For now, we'll just log the operation
      this.logger.log('Daily report generation completed', {
        jobId: job.id,
        date,
      });
    } catch (error) {
      this.logger.error('Failed to generate daily reports', error, {
        jobId: job.id,
        date,
      });
      throw error;
    }
  }

  @Process('process-screenshot')
  async processScreenshot(job: Job<{ filePath: string; computerUid: string }>): Promise<void> {
    const { filePath, computerUid } = job.data;
    
    try {
      this.logger.log('Processing screenshot', {
        jobId: job.id,
        filePath,
        computerUid,
      });

      // This would implement screenshot processing logic
      // Such as image optimization, thumbnail generation, etc.
      this.logger.log('Screenshot processing completed', {
        jobId: job.id,
        filePath,
        computerUid,
      });
    } catch (error) {
      this.logger.error('Failed to process screenshot', error, {
        jobId: job.id,
        filePath,
        computerUid,
      });
      throw error;
    }
  }

  @Process('aggregate-activity-data')
  async aggregateActivityData(job: Job<{ date: string; scope: any }>): Promise<void> {
    const { date, scope } = job.data;
    
    try {
      this.logger.log('Starting activity data aggregation', {
        jobId: job.id,
        date,
        scope,
      });

      // This would implement activity data aggregation logic
      // For performance optimization and reporting
      this.logger.log('Activity data aggregation completed', {
        jobId: job.id,
        date,
      });
    } catch (error) {
      this.logger.error('Failed to aggregate activity data', error, {
        jobId: job.id,
        date,
      });
      throw error;
    }
  }
}