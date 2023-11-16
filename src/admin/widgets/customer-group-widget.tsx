import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAdminCustomQuery, useAdminSalesChannels, useAdminCustomPost, useAdminCustomDelete } from "medusa-react";
import { CustomerGroupDetailsWidgetProps, WidgetConfig } from '@medusajs/admin';
import { usePrompt, Select, Badge,IconBadge, Button} from "@medusajs/ui";
import { SalesChannel } from 'src/models/SalesChannel';
import { Spinner } from "@medusajs/icons"
import { Trash } from "@medusajs/icons"

interface SalesChannelState {
  id: string;
  name: string;
}
const useSalesChannel = (customerGroupId: string) => {
  const [currentSalesChannel, setCurrentSalesChannel] = useState<SalesChannelState>({ id: '', name: '' });
  const { sales_channels: allSalesChannels, isLoading: isLoadingSalesChannels } = useAdminSalesChannels();
  const { refetch: fetchSalesChannel, isLoading: isFetching } = useAdminCustomQuery<SalesChannelState>(
    `/admin/customer-groups/${customerGroupId}/salesChannel`,
    ["customerGroupSalesChannel", customerGroupId]
  );

  useEffect(() => {
    fetchSalesChannel().then((response) => {
      if (response.data) {
        setCurrentSalesChannel({
          id: response.data.id,
          name: response.data.name,
        });
      }
    }).catch(console.error);
  }, [customerGroupId, fetchSalesChannel]);

  return {
    currentSalesChannel,
    setCurrentSalesChannel,
    allSalesChannels,
    isLoading: isLoadingSalesChannels || isFetching
  };
};

const ProductWidget = ({ customerGroup: initialCustomerGroup, notify }: CustomerGroupDetailsWidgetProps) => {
  const dialog = usePrompt();
 

  const {
    currentSalesChannel,
    allSalesChannels,
    setCurrentSalesChannel,
    isLoading
  } = useSalesChannel(initialCustomerGroup.id);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    setValue,
    reset // Added reset function from useForm
  } = useForm<SalesChannelState>({
    defaultValues: {
      id: '', // Removed the initial values
      name: '', // Removed the initial values
    }
  });

  // useEffect to update the form's default values after current sales channel is fetched
  useEffect(() => {
    if (currentSalesChannel.id) {
      reset({
        id: currentSalesChannel.id,
        name: currentSalesChannel.name,
      });
    }
  }, [currentSalesChannel, reset]);

  const selectedSalesChannelId = watch('id');
  const updateSalesChannelMutation = useAdminCustomPost<{ sales_channel_id: string }, any>(
    `/admin/customer-groups/${initialCustomerGroup.id}/salesChannel`,
    ["customerGroupSalesChannelUpdate", initialCustomerGroup.id]
  );

  const handleSalesChannelUpdate = useCallback(async () => {
    const confirmed = await dialog({
      title: "Are you sure?",
      description: "Please confirm this action",
    });

    if (!confirmed) return;

    updateSalesChannelMutation.mutate({ sales_channel_id: selectedSalesChannelId }, {
      onSuccess: (data) => {
        notify.success("","Sales channel updated successfully!");
        setCurrentSalesChannel({
          id: data.salesChannel.id,
          name: data.salesChannel.name,
        });
      },
      onError: (error) => {
        notify.error("","Error updating sales channel.");
        setError('id', { type: 'manual', message: error.message });
      },
    });
  }, [selectedSalesChannelId, updateSalesChannelMutation, dialog, notify, setError]);

  const handleSelectChange = (value: string) => {
    setValue('id', value); // Using setValue from useForm to update the selectedSalesChannelId
  };
  const selectOptions = allSalesChannels?.map((channel) => (
    <option key={channel.id} value={channel.id}>{channel.name}</option>
  ));


  const onSubmit = (data) => {
    handleSalesChannelUpdate();
  };
  const deleteSalesChannelMutation = useAdminCustomDelete<{ success: boolean }>(
    `/admin/customer-groups/${initialCustomerGroup.id}/salesChannel`,
    ["customerGroupSalesChannelDelete", initialCustomerGroup.id]
  );

  const handleSalesChannelDelete = useCallback(async () => {
    const confirmed = await dialog({
      title: "Are you sure?",
      description: "Confirm deletion of the sales channel. This action cannot be undone.",
    });

    if (!confirmed) return;

    deleteSalesChannelMutation.mutate({}, {
      onSuccess: () => {
        notify.success("","Sales channel deleted successfully!");
        setCurrentSalesChannel({ id: '', name: '' });
      },
      onError: (error) => {
        notify.error("","Error deleting sales channel.");
      },
    });
  }, [deleteSalesChannelMutation, dialog, notify]);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="bg-white p-4 border rounded-lg space-y-4">
      <h1 className="text-lg font-semibold">B2B Simple</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col space-y-2">
    <div className="text-xs font-semibold text-purple-600">
      Sales Channels
    </div>
    <div className="flex items-center justify-between">
          <span className="text-lg">
            {currentSalesChannel.id ? (
              <>
                <Badge>
        
 <a
                    href={`/a/sales-channels/${currentSalesChannel.id}`}
                    className="text-blue-500 hover:text-blue-600 transition duration-150 ease-in-out"
                    rel="noopener noreferrer"
                  >
                    {currentSalesChannel.name}
                  </a>   
                  <Trash className="text-red-500 hover:text-red-600 cursor-pointer" onClick={handleSalesChannelDelete} />

                </Badge>
               
              </>
            ) : (
              <Badge >None Linked</Badge>
            )}
          </span>
          <div className="flex space-x-2">
             <Controller
            name="id"
            control={control}
            render={({ field: { onChange, onBlur, value, name, ref } }) => (
              <Select size={"small"}onValueChange={handleSelectChange} value={value}>
                <Select.Trigger>
                  <Select.Value placeholder="Select a Sales Channel" />
                </Select.Trigger>
                <Select.Content>
                  {allSalesChannels?.map((channel) => (
                    <Select.Item key={channel.id} value={channel.id}>
                      {channel.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            )}/>


            <button
              type="submit"
              disabled={!selectedSalesChannelId || isLoading}
              className="px-2 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none disabled:bg-red-300 transition ease-in duration-150"
            >
              Update
            </button>
          </div>
          </div>       </div>
      </form>
    </div>
  );
};

export const config: WidgetConfig = {
  zone: 'customer_group.details.after',
};

export default ProductWidget;