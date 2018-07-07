/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import styled from 'react-emotion';

import TabHeader from '../TabHeader';
import InventoryHeader from './components/InventoryHeader';
import InventoryBody from './components/InventoryBody';
import { InventoryFilterButton } from '../../lib/constants';
import { ContainerIdToDrawerInfo } from '../ItemShared/InventoryBase';
import { InventoryItemFragment, GearSlotDefRefFragment } from '../../../../gqlInterfaces';
import { SlotItemDefType } from '../../lib/itemInterfaces';

const Container = styled('div')`
  position: relative;
  display: flex;
  flex-direction: column;
  user-select: none;
  width: 100%;
  height: 100%;

  &:after {
    content: '';
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    bottom: 0;
    width: 47px;
    background: url(images/inventory/bag-left-bg.png);
    background-size: cover;
    z-index: 0;
  }
`;

const BackgroundImage = styled('img')`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

export interface InventoryProps {
  onRightOrLeftItemAction: (item: InventoryItemFragment, action: (gearSlots: GearSlotDefRefFragment[]) => void) => void;
  showItemTooltip: (item: SlotItemDefType, event: MouseEvent) => void;
  hideItemTooltip: () => void;
  onChangeInventoryItems: (inventoryItems: InventoryItemFragment[]) => void;
  onChangeContainerIdToDrawerInfo: (newObj: ContainerIdToDrawerInfo) => void;
  onChangeStackGroupIdToItemIDs: (newObj: {[id: string]: string[]}) => void;
}

export interface ActiveFilters {
  [id: string]: InventoryFilterButton;
}

export interface InventoryState {
  filterText: string;
  activeFilters: ActiveFilters;
}

class Inventory extends React.Component<InventoryProps, InventoryState> {
  constructor(props: InventoryProps) {
    super (props);
    this.state = {
      filterText: '',
      activeFilters: {},
    };
  }

  public render() {
    return (
      <Container>
        <BackgroundImage src='images/inventory/bag-bg.png' />
        <TabHeader title={'INVENTORY'} />
        <InventoryHeader
          filterText={this.state.filterText}
          onFilterChanged={this.onFilterTextChanged}
          onFilterButtonActivated={this.onFilterButtonActivated}
          onFilterButtonDeactivated={this.onFilterButtonDeactivated}
        />
        <InventoryBody
          onRightOrLeftItemAction={this.props.onRightOrLeftItemAction}
          showTooltip={this.props.showItemTooltip}
          hideTooltip={this.props.hideItemTooltip}
          onChangeStackGroupIdToItemIDs={this.props.onChangeStackGroupIdToItemIDs}
          onChangeContainerIdToDrawerInfo={this.props.onChangeContainerIdToDrawerInfo}
          onChangeInventoryItems={this.props.onChangeInventoryItems}
          searchValue={this.state.filterText}
          activeFilters={this.state.activeFilters}
        />
      </Container>
    );
  }

  public componentDidCatch(error: Error, info: any) {
    console.error(error);
    console.log(info);
  }

  private onFilterTextChanged = (filterText: string) => {
    this.setState({ filterText });
  }

  private onFilterButtonActivated = (filter: InventoryFilterButton) => {
    this.setState((state) => {
      const activeFilters = Object.assign({}, state.activeFilters);
      activeFilters[filter.name] = filter;
      return {
        ...state,
        activeFilters,
      };
    });
  }

  private onFilterButtonDeactivated = (filter: InventoryFilterButton) => {
    this.setState((state) => {
      const activeFilters = Object.assign({}, state.activeFilters);
      delete activeFilters[filter.name];
      return {
        ...state,
        activeFilters,
      };
    });
  }
}

export default Inventory;
