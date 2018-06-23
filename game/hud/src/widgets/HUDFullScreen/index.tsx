/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import * as _ from 'lodash';
import { events, client, TabPanel, TabItem, jsKeyCodes } from '@csegames/camelot-unchained';
import { SecureTradeState } from '@csegames/camelot-unchained/lib/graphql/schema';

import HudFullScreenView from './HUDFullScreenView';
import { FullScreenNavState, FullScreenContext, HUDFullScreenTabData, defaultFullScreenState } from './lib/utils';
import { ContainerIdToDrawerInfo } from './components/ItemShared/InventoryBase';
import { InventoryItemFragment, EquippedItemFragment } from '../../gqlInterfaces';

export interface ITemporaryTab {
  name: string;
  tab: {
    title: string;
    [key: string]: any;
    temporary: boolean;
    onTemporaryTabClose: () => void;
  };
  rendersContent: string;
}

export interface FullScreenNavProps {
}

class HUDFullScreen extends React.Component<FullScreenNavProps, FullScreenNavState> {
  private navigateListener: number;
  private shouldKeydownListener: number;
  private tabPanelLeftRef: TabPanel<ITemporaryTab | HUDFullScreenTabData>;
  private tabPanelRightRef: TabPanel<ITemporaryTab | HUDFullScreenTabData>;

  constructor(props: any) {
    super(props);
    this.state = {...defaultFullScreenState};
  }

  public render() {
    return (
      <FullScreenContext.Provider value={this.state}>
        <HudFullScreenView
          getLeftRef={r => this.tabPanelLeftRef = r}
          getRightRef={r => this.tabPanelRightRef = r}
          onActiveTabChanged={(i, name) => this.handleTabChange(name)}
          onCloseFullScreen={this.onCloseFullScreen}
          onChangeInventoryItems={this.onChangeInventoryItems}
          onChangeEquippedItems={this.onChangeEquippedItems}
          onChangeMyTradeItems={this.onChangeMyTradeItems}
          onChangeContainerIdToDrawerInfo={this.onChangeContainerIdToDrawerInfo}
          onChangeStackGroupIdToItemIDs={this.onChangeStackGroupIdToItemIDs}
          onChangeMyTradeState={this.onChangeMyTradeState}
        />
      </FullScreenContext.Provider>
    );
  }

  public componentDidMount() {
    this.navigateListener = events.on('hudnav--navigate', this.handleNavEvent);
    this.shouldKeydownListener = events.on('hudfullscreen-shouldListenKeydown', this.handleShouldKeydownEvent);
    this.tabPanelRightRef.activeTabIndex = 1;
  }

  public componentDidUpdate(prevProps: FullScreenNavProps, prevState: FullScreenNavState) {
    if ((prevState.visibleComponentLeft === '' && this.state.visibleComponentLeft !== '') ||
        (prevState.visibleComponentRight === '' && this.state.visibleComponentRight !== '')) {
      window.addEventListener('keydown', this.handleKeydownEvent);
    }
  }

  public componentWillUnmount() {
    events.off(this.navigateListener);
    events.off(this.shouldKeydownListener);
  }

  private handleKeydownEvent = (e: KeyboardEvent) => {
    switch(e.keyCode) {
      case jsKeyCodes.ESC: {
        // Close full screen UI
        this.onCloseFullScreen();
        break;
      }
      case jsKeyCodes.I: {
        // Open/Close inventory
        events.fire('hudnav--navigate', 'inventory');
        break;
      }
      case jsKeyCodes.C: {
        // Open/Close paperdoll
        events.fire('hudnav--navigate', 'equippedgear');
        break;
      }
      default: break;
    }
  }

  private handleShouldKeydownEvent = (shouldListen: boolean) => {
    if (shouldListen) {
      window.addEventListener('keydown', this.handleKeydownEvent);
    } else {
      window.removeEventListener('keydown', this.handleKeydownEvent);
    }
  }

  private handleNavEvent = (name: string, shouldOpen?: boolean) => {
    if (name === 'inventory' || name === 'equippedgear' || name === 'character') {
      if (_.includes(this.state.visibleComponentLeft, name) || _.includes(this.state.visibleComponentRight, name)) {
        this.onCloseFullScreen();
      } else {
        this.setActiveTab(0, 'equippedgear-left');
        this.setActiveTab(1, 'inventory-right');
      }
      return;
    }

    if (name === 'trade' && typeof shouldOpen === 'boolean') {
      const tradeTab = {
        name: 'trade-left',
        tab: {
          title: 'Trade',
          temporary: true,
        },
        rendersContent: 'Trade',
      };
      if (shouldOpen) {
        this.setActiveTab(1, 'inventory-right');
        this.handleTemporaryTab({
          ...tradeTab,
          tab: {
            ...tradeTab.tab,
            onTemporaryTabClose: () => events.fire('hudnav--navigate', 'trade', false),
          },
        }, 'left', shouldOpen);
      } else {
        this.onCloseFullScreen();
        this.handleTemporaryTab(tradeTab as any, 'left', false);
      }
      return;
    }

    this.handleTabChange(name);
  }

  private handleTabChange = (name: string) => {
    // We do this to validate that no two windows are open at the same time
    const { tabsRight, tabsLeft } = this.state;
    const side = _.includes(name, 'right') ? 'right' : 'left';
    const tabs = side === 'right' ? tabsRight : tabsLeft;
    const otherTabs = side === 'right' ? tabsLeft : tabsRight;
    const nextTabIndex = _.findIndex(tabs, tab => tab.name === name);
    const prevTabIndex = side === 'right' ? this.tabPanelRightRef.activeTabIndex :
      this.tabPanelLeftRef.activeTabIndex;
    const otherActiveIndex = side === 'right' ? this.tabPanelLeftRef.activeTabIndex :
      this.tabPanelRightRef.activeTabIndex;

    if (nextTabIndex !== -1) {
      if (nextTabIndex === otherActiveIndex) {
        // Swap windows
        const otherPrevWindowIndex = _.findIndex(otherTabs, tab => {
          return this.normalizeName(tab.name) === this.normalizeName(tabs[prevTabIndex].name)
        });
        if (otherPrevWindowIndex !== -1) {
          this.setActiveTab(nextTabIndex, name);
          this.setActiveTab(otherPrevWindowIndex, otherTabs[otherPrevWindowIndex].name);
        }
      }
      this.setActiveTab(nextTabIndex, name);
    }
  }

  private setActiveTab = (tabIndex: number, name: string) => {
    const side = _.includes(name, 'right') ? 'right' : 'left';
    const visibleComponent = side === 'right' ? this.state.visibleComponentRight : this.state.visibleComponentLeft;

    if (name !== '' && !_.includes(visibleComponent, name)) {
      window.addEventListener('keydown', this.handleKeydownEvent);
      client.RequestInputOwnership();
      this.setState((state, props) => {
        if (side === 'right') {
          this.tabPanelRightRef.activeTabIndex = tabIndex;
          return {
            ...state,
            visibleComponentRight: name,

          };
        } else {
          this.tabPanelLeftRef.activeTabIndex = tabIndex;
          return {
            ...state,
            visibleComponentLeft: name,
          };
        }
      });
    } else {
      if (name === '') {
        this.setState((state, props) => {
          return {
            ...state,
            visibleComponentRight: '',
            visibleComponentLeft: '',
          };
        });
        setTimeout(() => client.ReleaseInputOwnership(), 100);
      }
    }
  }

  private handleTemporaryTab = (tab: ITemporaryTab, side: 'left' | 'right', shouldOpen: boolean) => {
    if (side === 'left') {
      let tabsLeft = [...this.state.tabsLeft];
      if (shouldOpen) {
        // Only add temporary tab if there is no temporary tab existing
        if (_.findIndex(tabsLeft, tabInfo => tabInfo.name === tab.name) === -1) {
          tabsLeft.push(tab);
          this.setTabsLeft(tabsLeft).then(() => this.setActiveTab(tabsLeft.length - 1, tab.name));
          return;
        }
      } else {
        tabsLeft = _.filter(tabsLeft, tabInfo => tabInfo.name !== tab.name);
        this.setActiveTab(0, 'equipped-left');
        setTimeout(() => this.setTabsLeft(tabsLeft), 50);
      }

      return;
    }

    if (side === 'right') {
      let tabsRight = [...this.state.tabsRight];
      if (shouldOpen) {
        // Only add temporary tab if there is no temporary tab existing
        if (_.findIndex(tabsRight, tabInfo => tabInfo.name === tab.name) === -1) {
          tabsRight.push(tab);
          this.setTabsRight(tabsRight).then(() => this.setActiveTab(tabsRight.length - 1, tab.name));
        }
      } else {
        tabsRight = _.filter(tabsRight, tabInfo => tabInfo.name !== tab.name);
        this.setActiveTab(0, 'equipped-right');
        setTimeout(() => this.setTabsRight(tabsRight), 50);
      }
      return;
    }
  }

  private setTabsLeft = async (newTabsLeft: TabItem<any>[]) => {
    return await new Promise((resolve) => this.setState({ tabsLeft: newTabsLeft }, () => resolve()));
  }

  private setTabsRight = async (newTabsRight: TabItem<any>[]) => {
    return await new Promise((resolve) => this.setState({ tabsRight: newTabsRight }, () => resolve()));
  }

  private normalizeName = (name: string) => {
    let newName = name;
    if (_.includes(name, 'right')) {
      newName = name.replace('-right', '');
    }

    if (_.includes(name, 'left')) {
      newName = name.replace('-left', '');
    }

    return newName;
  }

  private onCloseFullScreen = (visibleComp?: string) => {
    events.fire('hudnav--navigate', '');
    this.setActiveTab(0, '');
    window.removeEventListener('keydown', this.handleKeydownEvent);
    client.ReleaseInputOwnership();
  }

  private onChangeEquippedItems = (equippedItems: EquippedItemFragment[]) => {
    this.setState({ equippedItems });
  }

  private onChangeInventoryItems = (inventoryItems: InventoryItemFragment[]) => {
    this.setState({ inventoryItems });
  }

  private onChangeContainerIdToDrawerInfo = (containerIdToDrawerInfo: ContainerIdToDrawerInfo) => {
    this.setState({ containerIdToDrawerInfo });
  }

  private onChangeStackGroupIdToItemIDs = (stackGroupIdToItemIDs: {[id: string]: string[]}) => {
    this.setState({ stackGroupIdToItemIDs });
  }

  private onChangeMyTradeItems = (myTradeItems: InventoryItemFragment[]) => {
    this.setState({ myTradeItems });
  }

  private onChangeMyTradeState = (myTradeState: SecureTradeState) => {
    this.setState({ myTradeState });
  }
}

export default HUDFullScreen;
