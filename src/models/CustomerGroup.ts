import { Entity, ManyToOne, JoinColumn } from "typeorm";
import { CustomerGroup as MedusaCustomerGroup } from "@medusajs/medusa";
import { SalesChannel } from "./SalesChannel"; // Adjust the import path as necessary

@Entity()
export class CustomerGroup extends MedusaCustomerGroup {
    @ManyToOne(() => SalesChannel, salesChannel => salesChannel.customerGroups)
    @JoinColumn({ name: 'sales_channel_id' })
    salesChannel: SalesChannel;
}
