import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ActivitiesService, Activity } from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  async createActivity(@Body() activity: Activity) {
    console.log('=== ACTIVITY CREATION REQUEST ===');
    console.log('Raw request body received:', JSON.stringify(activity, null, 2));
    console.log('Activity user_id:', activity.user_id);
    console.log('Activity patient_id:', activity.patient_id);
    console.log('Activity type:', activity.activity_type);
    console.log('Activity site_name:', activity.site_name);
    console.log("Building name:", activity.building_name);
    console.log('Activity service_datetime:', activity.service_datetime);
    console.log('Activity duration_minutes:', activity.duration_minutes);
    console.log('Activity pharm_flag:', activity.pharm_flag);
    console.log('Activity notes:', activity.notes);
    console.log('=== END REQUEST DATA ===');
    
    try {
      const result = await this.activitiesService.createActivity(activity);
      console.log('=== ACTIVITY CREATION RESPONSE ===');
      console.log('Created activity result:', JSON.stringify(result, null, 2));
      console.log('=== END RESPONSE DATA ===');
      return result;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  @Get()
  async getAllActivities() {
    try {
      return await this.activitiesService.getActivities();
    } catch (error) {
      throw new HttpException('Failed to fetch activities', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('with-details')
  async getActivitiesWithDetails() {
    try {
      return await this.activitiesService.getActivitiesWithDetails();
    } catch (error) {
      throw new HttpException('Failed to fetch activities with details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getActivityById(@Param('id') id: string) {
    try {
      const activity = await this.activitiesService.getActivityById(parseInt(id));
      if (!activity) {
        throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
      }
      return activity;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('patient/:patientId')
  async getActivitiesByPatientId(@Param('patientId') patientId: string) {
    try {
      return await this.activitiesService.getActivitiesByPatientId(parseInt(patientId));
    } catch (error) {
      throw new HttpException('Failed to fetch patient activities', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateActivity(@Param('id') id: string, @Body() activity: Partial<Activity>) {
    try {
      const updatedActivity = await this.activitiesService.updateActivity(parseInt(id), activity);
      if (!updatedActivity) {
        throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
      }
      return updatedActivity;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteActivity(@Param('id') id: string) {
    try {
      await this.activitiesService.deleteActivity(parseInt(id));
      return { message: 'Activity deleted successfully' };
    } catch (error) {
      throw new HttpException('Failed to delete activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  
} 