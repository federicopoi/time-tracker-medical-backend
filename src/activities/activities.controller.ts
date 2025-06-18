import {Controller,Get,Post,Put,Delete,Body,Param,HttpException,HttpStatus,UseGuards} from '@nestjs/common';
import {ActivitiesService} from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { Activity } from './activites.interface';
import { AuthGuard } from '../auth/auth.guard';



@Controller('activities')
@UseGuards(AuthGuard)
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) {}


    @Post()
    async createActivity(@Body() activityDto: CreateActivityDto) {
        try{
            console.log('Received activity data:', activityDto);
            return await this.activitiesService.createActivity(activityDto as Activity);
        }catch(error){
            console.error('Error in createActivity controller:', error);
            throw new HttpException(`Failed to create activity: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get()
    async getActivites(){
        try{
            return await this.activitiesService.getActivites();
        }catch(error){
            throw new HttpException('Failed to fetch activities', HttpStatus.INTERNAL_SERVER_ERROR);
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
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Failed to fetch activity', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('patient/:patientId')
    async getActivitiesByPatientId(@Param('patientId') patientId: string) {
        try {
            return await this.activitiesService.getActivitesByPatientId(parseInt(patientId));
        } catch (error) {
            throw new HttpException('Failed to fetch activities for patient', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put(':id')
    async updateActivity(@Param('id') id: string, @Body() activityDto: UpdateActivityDto) {
        try {
            console.log('Received update data:', activityDto);
            return await this.activitiesService.updateActivity(parseInt(id), activityDto);
        } catch (error) {
            console.error('Error in updateActivity controller:', error);
            if (error.message.includes('not found')) {
                throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
            }
            throw new HttpException(`Failed to update activity: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
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