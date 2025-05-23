import { Icon } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useDashboardNamespace, useUser } from '~/redux/selectors';
import {
  artifactsRootPath,
  executionsRootPath,
  experimentsRootPath,
  pipelineRunsRootPath,
  pipelinesRootPath,
} from '~/routes';
import {
  generateWarningForHardwareProfiles,
  HardwareProfileBannerWarningTitles,
} from '~/pages/hardwareProfiles/utils';
import { AuthModel, HardwareProfileModel } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessAllowed, verbModelAccess } from '~/concepts/userSSAR';
import useMigratedHardwareProfiles from '~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { NavWithIcon } from './NavWithIcon';

type NavDataCommon = {
  id: string;
};

export type NavDataHref = NavDataCommon & {
  label: React.ReactNode;
  href: string;
};

export type NavDataGroup = NavDataCommon & {
  group: {
    id: string;
    title: string;
    icon?: React.ReactNode;
  };
  children: NavDataHref[];
};

export type NavDataItem = NavDataHref | NavDataGroup;

export const isNavDataHref = (navData: NavDataItem): navData is NavDataHref => 'href' in navData;
export const isNavDataGroup = (navData: NavDataItem): navData is NavDataGroup =>
  'children' in navData;

const useAreaCheck = <T,>(
  area: SupportedArea,
  success: T[],
  resourceAttributes?: AccessReviewResourceAttributes,
): T[] => {
  const [isAccessAllowed, isAccessLoaded] = useAccessAllowed(
    resourceAttributes || { verb: '*' },
    !!resourceAttributes,
  );
  const isAreaAvailable = useIsAreaAvailable(area).status;

  if (!resourceAttributes) {
    return isAreaAvailable ? success : [];
  }

  if (!isAccessLoaded) {
    return [];
  }

  return isAccessAllowed && isAreaAvailable ? success : [];
};

const useApplicationsNav = (): NavDataItem[] => {
  const isHomeAvailable = useIsAreaAvailable(SupportedArea.HOME).status;

  return [
    {
      id: 'applications',
      group: { id: 'apps', title: 'Applications' },
      children: [
        { id: 'apps-installed', label: 'Enabled', href: isHomeAvailable ? '/enabled' : '/' },
        { id: 'apps-explore', label: 'Explore', href: '/explore' },
      ],
    },
  ];
};

/**
 * @deprecated - when we move to SSAR for all admin navs, remove this.
 * @see UserState.isAdmin
 */
const useIsAdminAreaCheck: typeof useAreaCheck = (...args) => {
  const { isAdmin } = useUser();
  const navData = useAreaCheck(...args);

  return isAdmin ? navData : [];
};

const useHomeNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.HOME, [{ id: 'home', label: 'Home', href: '/' }]);

const useDSProjectsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DS_PROJECTS_VIEW, [
    { id: 'dsg', label: 'Data science projects', href: '/projects' },
  ]);

const useModelsNav = (): NavDataItem[] => {
  const modelCatalog = useAreaCheck(SupportedArea.MODEL_CATALOG, [
    { id: 'modelCatalog', label: 'Model catalog', href: '/modelCatalog' },
  ]);
  const modelRegistry = useAreaCheck(SupportedArea.MODEL_REGISTRY, [
    { id: 'modelRegistry', label: 'Model registry', href: '/modelRegistry' },
  ]);
  const modelServing = useAreaCheck(SupportedArea.MODEL_SERVING, [
    { id: 'modelServing', label: 'Model deployments', href: '/modelServing' },
  ]);
  const fineTuning = useAreaCheck(SupportedArea.FINE_TUNING, [
    { id: 'modelCustomization', label: 'Model customization', href: '/modelCustomization' },
  ]);

  const children = [...modelCatalog, ...modelRegistry, ...modelServing, ...fineTuning];

  if (children.length === 0) {
    return [];
  }

  return [
    {
      id: 'models',
      group: { id: 'models', title: 'Models' },
      children,
    },
  ];
};

const useDSPipelinesNav = (): NavDataItem[] => {
  const isAvailable = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;

  if (!isAvailable) {
    return [];
  }

  return [
    {
      id: 'pipelines-and-runs',
      group: { id: 'pipelines-and-runs', title: 'Data science pipelines' },
      children: [
        {
          id: 'pipelines',
          label: 'Pipelines',
          href: pipelinesRootPath,
        },
        {
          id: 'runs',
          label: 'Runs',
          href: pipelineRunsRootPath,
        },
      ],
    },
    {
      id: 'experiments',
      group: { id: 'experiments', title: 'Experiments' },
      children: [
        {
          id: 'experiments-and-runs',
          label: 'Experiments and runs',
          href: experimentsRootPath,
        },
        {
          id: 'executions',
          label: 'Executions',
          href: executionsRootPath,
        },
        {
          id: 'artifacts',
          label: 'Artifacts',
          href: artifactsRootPath,
        },
      ],
    },
  ];
};

const useDistributedWorkloadsNav = (): NavDataItem[] =>
  useAreaCheck(SupportedArea.DISTRIBUTED_WORKLOADS, [
    { id: 'workloadMetrics', label: 'Distributed workloads', href: '/distributedWorkloads' },
  ]);

const useResourcesNav = (): NavDataHref[] => [
  { id: 'resources', label: 'Resources', href: '/resources' },
];

const useCustomNotebooksNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.BYON, [
    {
      id: 'settings-workbench-images',
      label: 'Workbench images',
      href: '/workbenchImages',
    },
  ]);

const useClusterSettingsNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.CLUSTER_SETTINGS, [
    {
      id: 'settings-cluster-settings',
      label: 'Cluster settings',
      href: '/clusterSettings',
    },
  ]);

const useCustomRuntimesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.CUSTOM_RUNTIMES, [
    {
      id: 'settings-custom-serving-runtimes',
      label: 'Serving runtimes',
      href: '/servingRuntimes',
    },
  ]);

const useConnectionTypesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.ADMIN_CONNECTION_TYPES, [
    {
      id: 'settings-connection-types',
      label: 'Connection types',
      href: '/connectionTypes',
    },
  ]);

const useStorageClassesNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.STORAGE_CLASSES, [
    {
      id: 'settings-storage-classes',
      label: 'Storage classes',
      href: '/storageClasses',
    },
  ]);

const useModelRegisterySettingsNav = (): NavDataHref[] =>
  useIsAdminAreaCheck<NavDataHref>(SupportedArea.MODEL_REGISTRY, [
    {
      id: 'settings-model-registry',
      label: 'Model registry settings',
      href: '/modelRegistrySettings',
    },
  ]);

const useUserManagementNav = (): NavDataHref[] =>
  useAreaCheck<NavDataHref>(
    SupportedArea.USER_MANAGEMENT,
    [
      {
        id: 'settings-group-settings',
        label: 'User management',
        href: '/groupSettings',
      },
    ],
    verbModelAccess('update', AuthModel),
  );

const useAcceleratorProfilesNav = (): NavDataHref[] => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  return useIsAdminAreaCheck<NavDataHref>(
    SupportedArea.ACCELERATOR_PROFILES,
    isHardwareProfilesAvailable
      ? []
      : [
          {
            id: 'settings-accelerator-profiles',
            label: 'Accelerator profiles',
            href: '/acceleratorProfiles',
          },
        ],
  );
};

const useHardwareProfilesNav = (): {
  isWarning: boolean;
  hardwareProfileNavItems: NavDataHref[];
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { data: hardwareProfiles } = useMigratedHardwareProfiles(dashboardNamespace);
  const warning = generateWarningForHardwareProfiles(hardwareProfiles);
  const isWarning = !!warning && warning.title === HardwareProfileBannerWarningTitles.ALL_INVALID;
  return {
    isWarning,
    hardwareProfileNavItems: useAreaCheck<NavDataHref>(
      SupportedArea.HARDWARE_PROFILES,
      [
        {
          id: 'settings-hardware-profiles',
          label: isWarning ? (
            <NavWithIcon
              title="Hardware profiles"
              icon={
                <Icon status="warning" isInline>
                  <ExclamationTriangleIcon />
                </Icon>
              }
            />
          ) : (
            'Hardware profiles'
          ),
          href: '/hardwareProfiles',
        },
      ],
      // TODO: Determine if create is the best value -- RHOAIENG-21129
      verbModelAccess('create', HardwareProfileModel),
    ),
  };
};

const useSettingsNav = (): NavDataGroup[] => {
  const { isWarning, hardwareProfileNavItems } = useHardwareProfilesNav();

  const settingsNavs: NavDataHref[] = [
    ...useCustomNotebooksNav(),
    ...useClusterSettingsNav(),
    ...useAcceleratorProfilesNav(),
    ...hardwareProfileNavItems,
    ...useCustomRuntimesNav(),
    ...useConnectionTypesNav(),
    ...useStorageClassesNav(),
    ...useModelRegisterySettingsNav(),
    ...useUserManagementNav(),
  ];

  if (settingsNavs.length === 0) {
    return [];
  }

  return [
    {
      id: 'settings',
      group: {
        id: 'settings',
        title: 'Settings',
        icon: isWarning ? (
          <Icon status="warning" isInline>
            <ExclamationTriangleIcon />
          </Icon>
        ) : undefined,
      },
      children: settingsNavs,
    },
  ];
};

export const useBuildNavData = (): NavDataItem[] => [
  ...useHomeNav(),
  ...useDSProjectsNav(),
  ...useModelsNav(),
  ...useDSPipelinesNav(),
  ...useDistributedWorkloadsNav(),
  ...useApplicationsNav(),
  ...useResourcesNav(),
  ...useSettingsNav(),
];
