import { Entity, OneToMany } from "typeorm";
import { SalesChannel as MedusaSalesChannel } from "@medusajs/medusa";
import { CustomerGroup } from "./CustomerGroup"; // Adjust the import path as necessary

@Entity()
export class SalesChannel extends MedusaSalesChannel {
    @OneToMany(() => CustomerGroup, customerGroup => customerGroup.salesChannel)
    customerGroups: CustomerGroup[];
}
