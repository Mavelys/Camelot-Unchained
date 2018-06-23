  /*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import styled from 'react-emotion';
import { utils } from '@csegames/camelot-unchained';
import {
  onShowTooltip,
  onHideTooltip,
  offShowTooltip,
  offHideTooltip,
  ShowTooltipPayload,
  ToolTipStyle,
} from '../services/actions/tooltips';

const Container = styled('div')`
  display: inline-block;
  position: relative;
`;

const TooltipView = styled('div')`
  position: fixed;
  z-index: 9999;
`;

export interface TooltipProps {

}

export interface TooltipState {
  wndRegion: utils.Quadrant;
  show: boolean;
  ttClassName: string;
  offsetLeft: number;
  offsetRight: number;
  offsetTop: number;
  offsetBottom: number;
  content: JSX.Element | JSX.Element[];
  styles?: Partial<ToolTipStyle>;
}

export class Tooltip extends React.Component<TooltipProps, TooltipState> {
  private tooltipRef: HTMLDivElement;
  private windowDimensions: { innerHeight: number, innerWidth: number };
  private tooltipDimensions: { width: number, height: number };
  private onShowTooltipListener: number;
  private onHideTooltipListener: number;

  constructor(props: TooltipProps) {
    super(props);
    this.state = {
      wndRegion: utils.Quadrant.TopLeft,
      show: false,
      ttClassName: 'Tooltip',
      offsetLeft: 10,
      offsetTop: 10,
      offsetRight: 5,
      offsetBottom: 5,
      content: null,
      styles: {},
    };
  }

  public render() {
    const customStyles = this.state.styles || {};

    return this.state.show ? (
      <Container className={customStyles.Tooltip}>
        <TooltipView
          innerRef={(ref: HTMLDivElement) => this.tooltipRef = ref}
          className={customStyles.tooltip}>
            {this.state.content}
        </TooltipView>
      </Container>
    ) : null;
  }

  public componentDidMount() {
    this.initWindowDimensions();
    window.addEventListener('resize', this.initWindowDimensions);
    this.onShowTooltipListener = onShowTooltip(this.handleShowTooltip);
    this.onHideTooltipListener = onHideTooltip(this.handleHideTooltip);
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.initWindowDimensions);
    offShowTooltip(this.onShowTooltipListener);
    offHideTooltip(this.onHideTooltipListener);
  }

  private initWindowDimensions = () => {
    this.windowDimensions = { innerHeight: window.innerHeight, innerWidth: window.innerWidth };
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.tooltipDimensions && this.tooltipRef) {
      this.tooltipDimensions = this.tooltipRef.getBoundingClientRect();
    }

    let computedStyle;
    computedStyle = this.computeStyle(
      e.clientX,
      e.clientY,
      this.state.offsetLeft,
      this.state.offsetTop,
      this.state.offsetRight,
      this.state.offsetBottom,
    );

    if (this.tooltipRef && computedStyle) {
      if (computedStyle.bottom) {
        const topScreenOverflow = e.clientY - this.tooltipDimensions.height;
        if (topScreenOverflow < 0) {
          // Tooltip is overflowing the top of the viewport
          this.tooltipRef.style.bottom = `${computedStyle.bottom + topScreenOverflow}px`;
        } else {
          this.tooltipRef.style.bottom = `${computedStyle.bottom}px`;
        }
      }

      if (computedStyle.top) {
        const bottomScreenOverflow = this.windowDimensions.innerHeight - (e.clientY + this.tooltipDimensions.height);
        if (bottomScreenOverflow < 0) {
          // Tooltip is overflowing the bottom of the viewport
          this.tooltipRef.style.top = `${computedStyle.top + bottomScreenOverflow}px`;
        } else {
          this.tooltipRef.style.top = `${computedStyle.top}px`;
        }
      }

      this.tooltipRef.style.left = computedStyle.left ? `${computedStyle.left}px` : 'auto';
      this.tooltipRef.style.right = computedStyle.right ? `${computedStyle.right}px` : 'auto';
    }
  }

  private handleShowTooltip = (payload: ShowTooltipPayload) => {
    const { content, event, styles } = payload;
    window.addEventListener('mousemove', this.onMouseMove);
    this.setState({
      show: true,
      wndRegion: utils.windowQuadrant(event.clientX, event.clientY),
      content,
      styles,
    });
  }

  private handleHideTooltip = () => {
    window.removeEventListener('mousemove', this.onMouseMove);
    this.setState({ show: false, content: null, styles: {} });
  }

  private computeStyle = (x: number,
                          y: number,
                          offsetLeft: number,
                          offsetTop: number,
                          offsetRight: number,
                          offsetBottom: number) => {
    switch (this.state.wndRegion) {
      case utils.Quadrant.TopLeft:
        return {
          left: x + offsetLeft,
          top: y + offsetTop,
        };
      case utils.Quadrant.TopRight:
        return {
          right: this.windowDimensions.innerWidth - x + offsetRight,
          top: y + offsetTop,
        };
      case utils.Quadrant.BottomLeft:
        return {
          left: x + offsetLeft,
          bottom: this.windowDimensions.innerHeight - y + offsetBottom,
        };
      case utils.Quadrant.BottomRight:
        return {
          right: this.windowDimensions.innerWidth - x + offsetRight,
          bottom: this.windowDimensions.innerHeight - y + offsetBottom,
        };
    }
  }
}
