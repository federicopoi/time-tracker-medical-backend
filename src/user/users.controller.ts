import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { UsersService, User } from './users.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';



// @UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }


    @Post()
    async createUser(@Body() user: User) {
        try {
            return await this.usersService.createUser(user);
        } catch (error) {
            console.error('Error in createUser controller:', error);
            throw new HttpException(
                error.message || 'Failed to create user',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }


    @Get()
    async getUsers() {
        try {
            return await this.usersService.getUsers();
        } catch (error) {
            throw new HttpException('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Roles('Admin')
    @Get(':id')
    async getUserById(@Param('id') id: string) {
        try {
            const user = await this.usersService.getUserById(parseInt(id));
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }
            return user;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Failed to fetch user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @Roles('Admin')
    @Put(':id')
    async updateUser(@Param('id') id:string, @Body() user: Partial<User>){
        try{
            const updatedUser = await this.usersService.updateUser(parseInt(id), user);
            if(!updatedUser){
                throw new HttpException('User not found',HttpStatus.NOT_FOUND);
            }
            return updatedUser;
        }catch(error){
            if(error instanceof HttpException) throw error;
            
        }
    }

    @Roles('Admin')
    @Delete(':id')
    async deleteUser(@Param('id') id:string){
        try{
            await this.usersService.deleteUser(parseInt(id));
            return {message: 'User deleted successfully'};
        }catch(error){
            throw new HttpException('Failed to delete user',HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Optimized endpoint: Get users by site with site details
    @Get('site/:siteName/details')
    async getUsersBySiteWithDetails(@Param('siteName') siteName: string) {
        try {
            return await this.usersService.getUsersBySiteWithDetails(siteName);
        } catch (error) {
            console.error('Error in getUsersBySiteWithDetails controller:', error);
            throw new HttpException('Failed to fetch users by site with details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Optimized endpoint: Get all users with site details
    @Get('with-site-details')
    async getUsersWithSiteDetails() {
        try {
            return await this.usersService.getUsersWithSiteDetails();
        } catch (error) {
            console.error('Error in getUsersWithSiteDetails controller:', error);
            throw new HttpException('Failed to fetch users with site details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Optimized endpoint: Get user by ID with site details
    @Get(':id/with-site-details')
    async getUserByIdWithSiteDetails(@Param('id') id: string) {
        try {
            const user = await this.usersService.getUserByIdWithSiteDetails(parseInt(id));
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }
            return user;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            console.error('Error in getUserByIdWithSiteDetails controller:', error);
            throw new HttpException('Failed to fetch user with site details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

}