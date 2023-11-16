import { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import { EntityManager } from "typeorm";
import { CustomerGroup } from "../../../../../models/CustomerGroup"; // Adjust the import path as necessary
import { SalesChannel } from "../../../../../models/SalesChannel"; // Adjust the import path as necessary

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerGroupId = req.params.id; // Extract the ID from the URL
  const entityManager: EntityManager = req.scope.resolve("manager");

  try {
    const customerGroup = await entityManager.findOne(CustomerGroup, {
      where: { id: customerGroupId },
      relations: ["salesChannel"],
    });

    if (!customerGroup) {
      return res.status(404).json({ message: "Customer group not found" });
    }

    res.status(200).json(customerGroup.salesChannel);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerGroupId = req.params.id; // Extract the ID from the URL
  const salesChannelId = req.body.sales_channel_id; // Assuming this is passed in the body
  const entityManager: EntityManager = req.scope.resolve("manager");

  try {
    // Start a transaction to update the customer group's sales channel
    await entityManager.transaction(async transactionalEntityManager => {
      const customerGroup = await transactionalEntityManager.findOne(CustomerGroup, {
        where: { id: customerGroupId }
      });

      if (!customerGroup) {
        return res.status(404).json({ message: "Customer group not found" });
      }

      const salesChannel = await transactionalEntityManager.findOne(SalesChannel, {
        where: { id: salesChannelId }
      });

      if (!salesChannel) {
        return res.status(404).json({ message: "Sales channel not found" });
      }

      // Update the customer group's sales channel
      customerGroup.salesChannel = salesChannel;
      await transactionalEntityManager.save(customerGroup);
      
      res.status(200).json({ message: "Sales channel updated successfully", salesChannel: customerGroup.salesChannel });
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
export const DELETE = async (
    req: MedusaRequest,
    res: MedusaResponse
  ) => {
    const customerGroupId = req.params.id; // Extract the ID from the URL
    const entityManager: EntityManager = req.scope.resolve("manager");
  
    try {
      await entityManager.transaction(async transactionalEntityManager => {
        const customerGroup = await transactionalEntityManager.findOne(CustomerGroup, {
          where: { id: customerGroupId },
          relations: ["salesChannel"],
        });
  
        if (!customerGroup) {
          return res.status(404).json({ message: "Customer group not found" });
        }
  
        // Check if the customer group has a sales channel to delete
        if (!customerGroup.salesChannel) {
          return res.status(404).json({ message: "No sales channel to delete" });
        }
  
        // Set the sales channel to null and save the customer group
        customerGroup.salesChannel = null;
        await transactionalEntityManager.save(customerGroup);
  
        res.status(200).json({ message: "Sales channel deleted successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  };
  
