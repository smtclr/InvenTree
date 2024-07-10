import { t } from '@lingui/macro';
import { Group, Text } from '@mantine/core';
import { ReactNode, useMemo } from 'react';

import { AddItemButton } from '../../components/buttons/AddItemButton';
import { ActionDropdown } from '../../components/items/ActionDropdown';
import { formatCurrency, formatPriceRange } from '../../defaults/formatters';
import { ApiEndpoints } from '../../enums/ApiEndpoints';
import { ModelType } from '../../enums/ModelType';
import { UserRoles } from '../../enums/Roles';
import {
  StockOperationProps,
  useAddStockItem,
  useAssignStockItem,
  useChangeStockStatus,
  useCountStockItem,
  useDeleteStockItem,
  useMergeStockItem,
  useRemoveStockItem,
  useStockFields,
  useTransferStockItem
} from '../../forms/StockForms';
import { InvenTreeIcon } from '../../functions/icons';
import { useCreateApiFormModal } from '../../hooks/UseForm';
import { useTable } from '../../hooks/UseTable';
import { apiUrl } from '../../states/ApiState';
import { useUserState } from '../../states/UserState';
import { TableColumn } from '../Column';
import {
  DateColumn,
  DescriptionColumn,
  LocationColumn,
  PartColumn,
  StatusColumn
} from '../ColumnRenderers';
import { StatusFilterOptions, TableFilter } from '../Filter';
import { InvenTreeTable } from '../InvenTreeTable';
import { TableHoverCard } from '../TableHoverCard';

/**
 * Construct a list of columns for the stock item table
 */
function stockItemTableColumns(): TableColumn[] {
  return [
    {
      accessor: 'part',
      sortable: true,
      render: (record: any) => PartColumn(record?.part_detail)
    },
    DescriptionColumn({
      accessor: 'part_detail.description'
    }),
    {
      accessor: 'quantity',
      ordering: 'stock',
      sortable: true,
      title: t`Stock`,
      render: (record: any) => {
        // TODO: Push this out into a custom renderer
        let quantity = record?.quantity ?? 0;
        let allocated = record?.allocated ?? 0;
        let available = quantity - allocated;
        let text = quantity;
        let part = record?.part_detail ?? {};
        let extra: ReactNode[] = [];
        let color = undefined;

        // Determine if a stock item is "in stock"
        // TODO: Refactor this out into a function
        let in_stock =
          !record?.belongs_to &&
          !record?.consumed_by &&
          !record?.customer &&
          !record?.is_building &&
          !record?.sales_order &&
          !record?.expired &&
          record?.quantity &&
          record?.quantity > 0;

        if (record.serial && quantity == 1) {
          text = `# ${record.serial}`;
        }

        if (record.is_building) {
          color = 'blue';
          extra.push(
            <Text
              key="production"
              size="sm"
            >{t`This stock item is in production`}</Text>
          );
        }

        if (record.sales_order) {
          extra.push(
            <Text
              key="sales-order"
              size="sm"
            >{t`This stock item has been assigned to a sales order`}</Text>
          );
        }

        if (record.customer) {
          extra.push(
            <Text
              key="customer"
              size="sm"
            >{t`This stock item has been assigned to a customer`}</Text>
          );
        }

        if (record.belongs_to) {
          extra.push(
            <Text
              key="belongs-to"
              size="sm"
            >{t`This stock item is installed in another stock item`}</Text>
          );
        }

        if (record.consumed_by) {
          extra.push(
            <Text
              key="consumed-by"
              size="sm"
            >{t`This stock item has been consumed by a build order`}</Text>
          );
        }

        if (record.expired) {
          extra.push(
            <Text
              key="expired"
              size="sm"
            >{t`This stock item has expired`}</Text>
          );
        } else if (record.stale) {
          extra.push(
            <Text key="stale" size="sm">{t`This stock item is stale`}</Text>
          );
        }

        if (allocated > 0) {
          if (allocated >= quantity) {
            color = 'orange';
            extra.push(
              <Text
                key="fully-allocated"
                size="sm"
              >{t`This stock item is fully allocated`}</Text>
            );
          } else {
            extra.push(
              <Text
                key="partially-allocated"
                size="sm"
              >{t`This stock item is partially allocated`}</Text>
            );
          }
        }

        if (available != quantity) {
          if (available > 0) {
            extra.push(
              <Text key="available" size="sm" color="orange">
                {t`Available` + `: ${available}`}
              </Text>
            );
          } else {
            extra.push(
              <Text
                key="no-stock"
                size="sm"
                color="red"
              >{t`No stock available`}</Text>
            );
          }
        }

        if (quantity <= 0) {
          extra.push(
            <Text
              key="depleted"
              size="sm"
            >{t`This stock item has been depleted`}</Text>
          );
        }

        if (!in_stock) {
          color = 'red';
        }

        return (
          <TableHoverCard
            value={
              <Group gap="xs" justify="left" wrap="nowrap">
                <Text c={color}>{text}</Text>
                {part.units && (
                  <Text size="xs" color={color}>
                    [{part.units}]
                  </Text>
                )}
              </Group>
            }
            title={t`Stock Information`}
            extra={extra}
          />
        );
      }
    },
    StatusColumn({ model: ModelType.stockitem }),
    {
      accessor: 'batch',
      sortable: true
    },
    LocationColumn({
      accessor: 'location_detail'
    }),
    DateColumn({
      accessor: 'stocktake_date',
      title: t`Stocktake`,
      sortable: true
    }),
    DateColumn({
      accessor: 'expiry_date'
    }),
    DateColumn({
      accessor: 'updated'
    }),
    // TODO: purchase order
    // TODO: Supplier part
    {
      accessor: 'purchase_price',
      sortable: true,
      switchable: true,
      render: (record: any) =>
        formatCurrency(record.purchase_price, {
          currency: record.purchase_price_currency
        })
    },
    {
      accessor: 'packaging',
      sortable: true
    },
    {
      accessor: 'stock_value',
      title: t`Stock Value`,
      sortable: false,
      render: (record: any) => {
        let min_price =
          record.purchase_price || record.part_detail?.pricing_min;
        let max_price =
          record.purchase_price || record.part_detail?.pricing_max;
        let currency = record.purchase_price_currency || undefined;

        return formatPriceRange(min_price, max_price, {
          currency: currency,
          multiplier: record.quantity
        });
      }
    },
    {
      accessor: 'notes',
      sortable: false
    }
  ];
}

/**
 * Construct a list of available filters for the stock item table
 */
function stockItemTableFilters(): TableFilter[] {
  return [
    {
      name: 'active',
      label: t`Active`,
      description: t`Show stock for active parts`
    },
    {
      name: 'status',
      label: t`Status`,
      description: t`Filter by stock status`,
      choiceFunction: StatusFilterOptions(ModelType.stockitem)
    },
    {
      name: 'assembly',
      label: t`Assembly`,
      description: t`Show stock for assmebled parts`
    },
    {
      name: 'allocated',
      label: t`Allocated`,
      description: t`Show items which have been allocated`
    },
    {
      name: 'available',
      label: t`Available`,
      description: t`Show items which are available`
    },
    {
      name: 'cascade',
      label: t`Include Sublocations`,
      description: t`Include stock in sublocations`
    },
    {
      name: 'depleted',
      label: t`Depleted`,
      description: t`Show depleted stock items`
    },
    {
      name: 'in_stock',
      label: t`In Stock`,
      description: t`Show items which are in stock`
    },
    {
      name: 'is_building',
      label: t`In Production`,
      description: t`Show items which are in production`
    },
    {
      name: 'include_variants',
      label: t`Include Variants`,
      description: t`Include stock items for variant parts`
    },
    {
      name: 'installed',
      label: t`Installed`,
      description: t`Show stock items which are installed in other items`
    },
    {
      name: 'sent_to_customer',
      label: t`Sent to Customer`,
      description: t`Show items which have been sent to a customer`
    },
    {
      name: 'serialized',
      label: t`Is Serialized`,
      description: t`Show items which have a serial number`
    },
    // TODO: serial
    // TODO: serial_gte
    // TODO: serial_lte
    {
      name: 'has_batch',
      label: t`Has Batch Code`,
      description: t`Show items which have a batch code`
    },
    // TODO: batch
    {
      name: 'tracked',
      label: t`Tracked`,
      description: t`Show tracked items`
    },
    {
      name: 'has_purchase_price',
      label: t`Has Purchase Price`,
      description: t`Show items which have a purchase price`
    },
    // TODO: Expired
    // TODO: stale
    // TODO: expiry_date_lte
    // TODO: expiry_date_gte
    {
      name: 'external',
      label: t`External Location`,
      description: t`Show items in an external location`
    }
  ];
}

/*
 * Load a table of stock items
 */
export function StockItemTable({
  params = {},
  allowAdd = false,
  tableName = 'stockitems'
}: {
  params?: any;
  allowAdd?: boolean;
  tableName: string;
}) {
  let tableColumns = useMemo(() => stockItemTableColumns(), []);
  let tableFilters = useMemo(() => stockItemTableFilters(), []);

  const table = useTable(tableName);
  const user = useUserState();

  const tableActionParams: StockOperationProps = useMemo(() => {
    return {
      items: table.selectedRecords,
      model: ModelType.stockitem,
      refresh: table.refreshTable,
      filters: {
        in_stock: true
      }
    };
  }, [table]);

  const stockItemFields = useStockFields({ create: true });

  const newStockItem = useCreateApiFormModal({
    url: ApiEndpoints.stock_item_list,
    title: t`Add Stock Item`,
    fields: stockItemFields,
    initialData: {
      part: params.part,
      location: params.location
    },
    follow: true,
    modelType: ModelType.stockitem
  });

  const transferStock = useTransferStockItem(tableActionParams);
  const addStock = useAddStockItem(tableActionParams);
  const removeStock = useRemoveStockItem(tableActionParams);
  const countStock = useCountStockItem(tableActionParams);
  const changeStockStatus = useChangeStockStatus(tableActionParams);
  const mergeStock = useMergeStockItem(tableActionParams);
  const assignStock = useAssignStockItem(tableActionParams);
  const deleteStock = useDeleteStockItem(tableActionParams);

  const tableActions = useMemo(() => {
    let can_delete_stock = user.hasDeleteRole(UserRoles.stock);
    let can_add_stock = user.hasAddRole(UserRoles.stock);
    let can_add_stocktake = user.hasAddRole(UserRoles.stocktake);
    let can_add_order = user.hasAddRole(UserRoles.purchase_order);
    let can_change_order = user.hasChangeRole(UserRoles.purchase_order);
    return [
      <ActionDropdown
        tooltip={t`Stock Actions`}
        icon={<InvenTreeIcon icon="stock" />}
        disabled={table.selectedRecords.length === 0}
        actions={[
          {
            name: t`Add stock`,
            icon: <InvenTreeIcon icon="add" iconProps={{ color: 'green' }} />,
            tooltip: t`Add a new stock item`,
            disabled: !can_add_stock,
            onClick: () => {
              addStock.open();
            }
          },
          {
            name: t`Remove stock`,
            icon: <InvenTreeIcon icon="remove" iconProps={{ color: 'red' }} />,
            tooltip: t`Remove some quantity from a stock item`,
            disabled: !can_add_stock,
            onClick: () => {
              removeStock.open();
            }
          },
          {
            name: 'Count Stock',
            icon: (
              <InvenTreeIcon icon="stocktake" iconProps={{ color: 'blue' }} />
            ),
            tooltip: 'Count Stock',
            disabled: !can_add_stocktake,
            onClick: () => {
              countStock.open();
            }
          },
          {
            name: t`Transfer stock`,
            icon: (
              <InvenTreeIcon icon="transfer" iconProps={{ color: 'blue' }} />
            ),
            tooltip: t`Move Stock items to new locations`,
            disabled: !can_add_stock,
            onClick: () => {
              transferStock.open();
            }
          },
          {
            name: t`Change stock status`,
            icon: <InvenTreeIcon icon="info" iconProps={{ color: 'blue' }} />,
            tooltip: t`Change the status of stock items`,
            disabled: !can_add_stock,
            onClick: () => {
              changeStockStatus.open();
            }
          },
          {
            name: t`Merge stock`,
            icon: <InvenTreeIcon icon="merge" />,
            tooltip: t`Merge stock items`,
            disabled: !can_add_stock,
            onClick: () => {
              mergeStock.open();
            }
          },
          {
            name: t`Order stock`,
            icon: <InvenTreeIcon icon="buy" />,
            tooltip: t`Order new stock`,
            disabled: !can_add_order || !can_change_order
          },
          {
            name: t`Assign to customer`,
            icon: <InvenTreeIcon icon="customer" />,
            tooltip: t`Order new stock`,
            disabled: !can_add_stock,
            onClick: () => {
              assignStock.open();
            }
          },
          {
            name: t`Delete stock`,
            icon: <InvenTreeIcon icon="delete" iconProps={{ color: 'red' }} />,
            tooltip: t`Delete stock items`,
            disabled: !can_delete_stock,
            onClick: () => {
              deleteStock.open();
            }
          }
        ]}
      />,
      <AddItemButton
        hidden={!allowAdd || !user.hasAddRole(UserRoles.stock)}
        tooltip={t`Add Stock Item`}
        onClick={() => newStockItem.open()}
      />
    ];
  }, [user, table, allowAdd]);

  return (
    <>
      {newStockItem.modal}
      {transferStock.modal}
      {removeStock.modal}
      {addStock.modal}
      {countStock.modal}
      {changeStockStatus.modal}
      {mergeStock.modal}
      {assignStock.modal}
      {deleteStock.modal}
      <InvenTreeTable
        url={apiUrl(ApiEndpoints.stock_item_list)}
        tableState={table}
        columns={tableColumns}
        props={{
          enableDownload: true,
          enableSelection: true,
          enableLabels: true,
          enableReports: true,
          tableFilters: tableFilters,
          tableActions: tableActions,
          modelType: ModelType.stockitem,
          params: {
            ...params,
            part_detail: true,
            location_detail: true,
            supplier_part_detail: true
          }
        }}
      />
    </>
  );
}
