/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * @Author: JB (jb@codecorsair.com)
 * @Date: 2017-01-23 17:43:58
 * @Last Modified by: Andrew Jackson (jacksonal300@gmail.com)
 * @Last Modified time: 2017-08-21 17:59:58
 */
import { LayoutMode } from '../../../components/HUDDrag';
import SiegeHealth, { HealthFor } from '../../../components/SiegeHealth';
import HUDZOrder from '../HUDZOrder';

export default {
  position: {
    x: {
      anchor: 5,
      offset: 250,
    },
    y: {
      anchor: 6,
      offset: 150,
    },
    size: {
      width: 200,
      height: 50,
    },
    scale: 1,
    opacity: 1,
    visibility: true,
    zOrder: HUDZOrder.FriendlyTargetSiegeHealth,
    layoutMode: LayoutMode.GRID,
  },
  dragOptions: {},
  component: SiegeHealth,
  props: {
    for: HealthFor.FriendlyTarget,
  },
};
