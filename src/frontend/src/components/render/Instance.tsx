import { t } from '@lingui/macro';
import { Alert, Anchor, Group, Skeleton, Space, Text } from '@mantine/core';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ReactNode, useCallback } from 'react';

import { api } from '../../App';
import { ModelType } from '../../enums/ModelType';
import { navigateToLink } from '../../functions/navigation';
import { apiUrl } from '../../states/ApiState';
import { Thumbnail } from '../images/Thumbnail';
import { RenderBuildLine, RenderBuildOrder } from './Build';
import {
  RenderAddress,
  RenderCompany,
  RenderContact,
  RenderManufacturerPart,
  RenderSupplierPart
} from './Company';
import { RenderImportSession, RenderProjectCode } from './Generic';
import { ModelInformationDict } from './ModelType';
import {
  RenderPurchaseOrder,
  RenderReturnOrder,
  RenderSalesOrder,
  RenderSalesOrderShipment
} from './Order';
import {
  RenderPart,
  RenderPartCategory,
  RenderPartParameterTemplate,
  RenderPartTestTemplate
} from './Part';
import { RenderPlugin } from './Plugin';
import { RenderLabelTemplate, RenderReportTemplate } from './Report';
import {
  RenderStockItem,
  RenderStockLocation,
  RenderStockLocationType
} from './Stock';
import { RenderOwner, RenderUser } from './User';

type EnumDictionary<T extends string | symbol | number, U> = {
  [K in T]: U;
};

export interface InstanceRenderInterface {
  instance: any;
  link?: boolean;
  navigate?: any;
}

/**
 * Lookup table for rendering a model instance
 */
const RendererLookup: EnumDictionary<
  ModelType,
  (props: Readonly<InstanceRenderInterface>) => ReactNode
> = {
  [ModelType.address]: RenderAddress,
  [ModelType.build]: RenderBuildOrder,
  [ModelType.buildline]: RenderBuildLine,
  [ModelType.company]: RenderCompany,
  [ModelType.contact]: RenderContact,
  [ModelType.manufacturerpart]: RenderManufacturerPart,
  [ModelType.owner]: RenderOwner,
  [ModelType.part]: RenderPart,
  [ModelType.partcategory]: RenderPartCategory,
  [ModelType.partparametertemplate]: RenderPartParameterTemplate,
  [ModelType.parttesttemplate]: RenderPartTestTemplate,
  [ModelType.projectcode]: RenderProjectCode,
  [ModelType.purchaseorder]: RenderPurchaseOrder,
  [ModelType.purchaseorderline]: RenderPurchaseOrder,
  [ModelType.returnorder]: RenderReturnOrder,
  [ModelType.salesorder]: RenderSalesOrder,
  [ModelType.salesordershipment]: RenderSalesOrderShipment,
  [ModelType.stocklocation]: RenderStockLocation,
  [ModelType.stocklocationtype]: RenderStockLocationType,
  [ModelType.stockitem]: RenderStockItem,
  [ModelType.stockhistory]: RenderStockItem,
  [ModelType.supplierpart]: RenderSupplierPart,
  [ModelType.user]: RenderUser,
  [ModelType.importsession]: RenderImportSession,
  [ModelType.reporttemplate]: RenderReportTemplate,
  [ModelType.labeltemplate]: RenderLabelTemplate,
  [ModelType.pluginconfig]: RenderPlugin
};

export type RenderInstanceProps = {
  model: ModelType | undefined;
} & InstanceRenderInterface;

/**
 * Render an instance of a database model, depending on the provided data
 */
export function RenderInstance(props: RenderInstanceProps): ReactNode {
  if (props.model === undefined) {
    console.error('RenderInstance: No model provided');
    return <UnknownRenderer model={props.model} />;
  }

  const RenderComponent = RendererLookup[props.model];

  if (!RenderComponent) {
    console.error(`RenderInstance: No renderer for model ${props.model}`);
    return <UnknownRenderer model={props.model} />;
  }

  return <RenderComponent {...props} />;
}

export function RenderRemoteInstance({
  model,
  pk
}: {
  model: ModelType;
  pk: number;
}): ReactNode {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['model', model, pk],
    queryFn: async () => {
      const url = apiUrl(ModelInformationDict[model].api_endpoint, pk);

      return api
        .get(url)
        .then((response) => response.data)
        .catch(() => null);
    }
  });

  if (isLoading || isFetching) {
    return <Skeleton />;
  }

  if (!data) {
    return <Text>${pk}</Text>;
  }

  return <RenderInstance model={model} instance={data} />;
}

/**
 * Helper function for rendering an inline model in a consistent style
 */
export function RenderInlineModel({
  primary,
  secondary,
  suffix,
  image,
  labels,
  url,
  navigate
}: {
  primary: string;
  secondary?: string;
  suffix?: ReactNode;
  image?: string;
  labels?: string[];
  url?: string;
  navigate?: any;
}): ReactNode {
  // TODO: Handle labels

  const onClick = useCallback(
    (event: any) => {
      if (url && navigate) {
        navigateToLink(url, navigate, event);
      }
    },
    [url, navigate]
  );

  return (
    <Group gap="xs" justify="space-between" wrap="nowrap">
      <Group gap="xs" justify="left" wrap="nowrap">
        {image && Thumbnail({ src: image, size: 18 })}
        {url ? (
          <Anchor href={url} onClick={(event: any) => onClick(event)}>
            <Text size="sm">{primary}</Text>
          </Anchor>
        ) : (
          <Text size="sm">{primary}</Text>
        )}
        {secondary && <Text size="xs">{secondary}</Text>}
      </Group>
      {suffix && (
        <>
          <Space />
          <div style={{ fontSize: 'xs', lineHeight: 'xs' }}>{suffix}</div>
        </>
      )}
    </Group>
  );
}

export function UnknownRenderer({
  model
}: {
  model: ModelType | undefined;
}): ReactNode {
  return (
    <Alert color="red" title={t`Unknown model: ${model}`}>
      <></>
    </Alert>
  );
}
