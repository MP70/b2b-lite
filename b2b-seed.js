const { default: loaders } = require("@medusajs/medusa/dist/loaders");
const express = require("express");

class B2BSeeder {
  static async seed() {
    const app = express();
    
    // Load the container with all the services
    const { container } = await loaders({
      directory: process.cwd(),
      expressApp: app,
      isTest: false,
    });

    const salesChannelService = container.resolve("salesChannelService");
    const productService = container.resolve("productService");

    // Retrieve an existing B2B sales channel or create a new one if it doesn't exist
    const [salesChannels] = await salesChannelService.listAndCount({});
    let b2bChannel = salesChannels.find(channel => channel.name === "B2B Sales Channel 001");

    if (!b2bChannel) {
      b2bChannel = await salesChannelService.create({
        name: "B2B Sales Channel 001",
      });
    }

    // Ensure b2bChannel has an id
    if (!b2bChannel.id) {
      throw new Error("Failed to create or retrieve B2B sales channel.");
    }

    // Retrieve all products with titles beginning with "priv"
    const products = await productService.list({});
    const privProductsIds = products
      .filter(product => product.title.startsWith("priv"))
      .map(product => product.id);
    
    // Batch add products to the B2B sales channel
    if (privProductsIds.length) {
      await salesChannelService.addProducts(b2bChannel.id, privProductsIds);
    }

    // Remove 'priv' products from all sales channels except B2B
    const removalPromises = salesChannels
      .filter(channel => channel.id !== b2bChannel.id) // Exclude B2B channel
      .map(async channel => {
        const productIdsByChannel = await salesChannelService.listProductIdsBySalesChannelIds([channel.id]);
        // Check if the channel ID is in the response before trying to filter
        if (productIdsByChannel && productIdsByChannel[channel.id]) {
          const productIdsToRemove = productIdsByChannel[channel.id].filter(id => privProductsIds.includes(id));
          if (productIdsToRemove.length) {
            await salesChannelService.removeProducts(channel.id, productIdsToRemove);
          }
        }
      });

    // Wait for all removalPromises to complete
    await Promise.all(removalPromises);

    const customerService = container.resolve("customerService");
    const username = "b2bcustomer001";
    const password = "b2bcustomer001";

    let newCustomer;
    try {
      newCustomer = await customerService.create({
        email: `${username}@example.com`,
        password: password, 
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }

    //create a customer group 
    const customerGroupService = container.resolve("customerGroupService");
    let b2bCustGroup;
    try {
      b2bCustGroup = await customerGroupService.create({
        name: "b2bCustGroup001",
      });
    } catch (error) {
      console.error("Error creating customer group:", error);
      throw error;
    }

    // Add the newly created customer to the `b2bcustgroup`
    try {
      await customerGroupService.addCustomers(b2bCustGroup.id, [newCustomer.id]);
    } catch (error) {
      console.error("Error adding customer to customer group:", error);
      throw error;
    }


  }
}

// Execute the seed method if this script is run directly from the command line
if (require.main === module) {
  B2BSeeder.seed()
    .then(() => console.log('B2B seeding completed successfully.'))
    .catch(error => {
      console.error('B2B seeding failed:', error);
      process.exit(1);
    });
}

module.exports = B2BSeeder;
