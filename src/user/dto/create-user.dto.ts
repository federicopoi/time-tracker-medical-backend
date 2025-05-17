export class CreateUserDto {
    first_name:string;
    last_name:string;
    email:string;
    password:string;
    role: "admin" | "nurse" | "pharmacist";
    primarySite:string;
    assignedSites:string[];

}