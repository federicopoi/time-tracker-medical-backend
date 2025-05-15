import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { Site, CreateSiteDto, UpdateSiteDto } from './site.interface';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  async createSite(@Body() createSiteDto: CreateSiteDto): Promise<Site> {
    return this.sitesService.createSite(createSiteDto);
  }

  @Get()
  async getAllSites(): Promise<Site[]> {
    return this.sitesService.getAllSites();
  }

  @Get(':id')
  async getSiteById(@Param('id') id: string): Promise<Site> {
    const site = await this.sitesService.getSiteById(Number(id));
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found`);
    }
    return site;
  }

  @Get('name/:name')
  async getSiteByName(@Param('name') name: string): Promise<Site> {
    const site = await this.sitesService.getSiteByName(name);
    if (!site) {
      throw new NotFoundException(`Site with name ${name} not found`);
    }
    return site;
  }

  @Put(':id')
  async updateSite(
    @Param('id') id: string,
    @Body() updateSiteDto: UpdateSiteDto,
  ): Promise<Site> {
    const site = await this.sitesService.updateSite(Number(id), updateSiteDto);
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found`);
    }
    return site;
  }

  @Delete(':id')
  async deleteSite(@Param('id') id: string): Promise<void> {
    const site = await this.sitesService.getSiteById(Number(id));
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found`);
    }
    return this.sitesService.deleteSite(Number(id));
  }
} 