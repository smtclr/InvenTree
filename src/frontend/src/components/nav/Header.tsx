import { ActionIcon, Container, Group, Indicator, Tabs } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBell, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { api } from '../../App';
import { navTabs as mainNavTabs } from '../../defaults/links';
import { ApiEndpoints } from '../../enums/ApiEndpoints';
import { navigateToLink } from '../../functions/navigation';
import * as classes from '../../main.css';
import { apiUrl } from '../../states/ApiState';
import { useLocalState } from '../../states/LocalState';
import { useUserState } from '../../states/UserState';
import { ScanButton } from '../buttons/ScanButton';
import { SpotlightButton } from '../buttons/SpotlightButton';
import { MainMenu } from './MainMenu';
import { NavHoverMenu } from './NavHoverMenu';
import { NavigationDrawer } from './NavigationDrawer';
import { NotificationDrawer } from './NotificationDrawer';
import { SearchDrawer } from './SearchDrawer';

export function Header() {
  const [setNavigationOpen, navigationOpen] = useLocalState((state) => [
    state.setNavigationOpen,
    state.navigationOpen
  ]);
  const [navDrawerOpened, { open: openNavDrawer, close: closeNavDrawer }] =
    useDisclosure(navigationOpen);
  const [
    searchDrawerOpened,
    { open: openSearchDrawer, close: closeSearchDrawer }
  ] = useDisclosure(false);

  const [
    notificationDrawerOpened,
    { open: openNotificationDrawer, close: closeNotificationDrawer }
  ] = useDisclosure(false);

  const { isLoggedIn } = useUserState();

  const [notificationCount, setNotificationCount] = useState<number>(0);

  // Fetch number of notifications for the current user
  const notifications = useQuery({
    queryKey: ['notification-count'],
    enabled: isLoggedIn(),
    queryFn: async () => {
      if (!isLoggedIn()) {
        return null;
      }

      try {
        const params = {
          params: {
            read: false,
            limit: 1
          }
        };
        let response = await api
          .get(apiUrl(ApiEndpoints.notifications_list), params)
          .catch(() => {
            return null;
          });
        setNotificationCount(response?.data?.count ?? 0);
        return response?.data ?? null;
      } catch (error) {
        return null;
      }
    },
    refetchInterval: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Sync Navigation Drawer state with zustand
  useEffect(() => {
    if (navigationOpen === navDrawerOpened) return;
    setNavigationOpen(navDrawerOpened);
  }, [navDrawerOpened]);

  useEffect(() => {
    if (navigationOpen === navDrawerOpened) return;
    if (navigationOpen) openNavDrawer();
    else closeNavDrawer();
  }, [navigationOpen]);

  return (
    <div className={classes.layoutHeader}>
      <SearchDrawer opened={searchDrawerOpened} onClose={closeSearchDrawer} />
      <NavigationDrawer opened={navDrawerOpened} close={closeNavDrawer} />
      <NotificationDrawer
        opened={notificationDrawerOpened}
        onClose={() => {
          notifications.refetch();
          closeNotificationDrawer();
        }}
      />
      <Container className={classes.layoutHeaderSection} size="100%">
        <Group justify="space-between">
          <Group>
            <NavHoverMenu openDrawer={openNavDrawer} />
            <NavTabs />
          </Group>
          <Group>
            <ActionIcon onClick={openSearchDrawer} variant="transparent">
              <IconSearch />
            </ActionIcon>
            <SpotlightButton />
            <ScanButton />
            <Indicator
              radius="lg"
              size="18"
              label={notificationCount}
              color="red"
              disabled={notificationCount <= 0}
              inline
            >
              <ActionIcon
                onClick={openNotificationDrawer}
                variant="transparent"
              >
                <IconBell />
              </ActionIcon>
            </Indicator>
            <MainMenu />
          </Group>
        </Group>
      </Container>
    </div>
  );
}

function NavTabs() {
  const navigate = useNavigate();
  const match = useMatch(':tabName/*');
  const tabValue = match?.params.tabName;

  return (
    <Tabs
      defaultValue="home"
      classNames={{
        root: classes.tabs,
        list: classes.tabsList,
        tab: classes.tab
      }}
      value={tabValue}
    >
      <Tabs.List>
        {mainNavTabs.map((tab) => (
          <Tabs.Tab
            value={tab.name}
            key={tab.name}
            onClick={(event: any) =>
              navigateToLink(`/${tab.name}`, navigate, event)
            }
          >
            {tab.text}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
