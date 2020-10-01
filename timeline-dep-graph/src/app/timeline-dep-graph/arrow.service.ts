import { Injectable } from '@angular/core';
import { Timeline } from 'vis';

import { Task, TaskId } from './Task';
import { DependeciesChanges } from './timeline/timeline.component';

export interface ItemPosition {
  left: number;
  top: number;
  right: number;
  bottom: number;
  midX: number;
  midY: number;
  width: number;
  height: number;
}

interface RangeItem {
  top: number;
  left: number;
  width: number;
  height: number;
  parent: {
    top: number;
    height: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ArrowService {
  private svg: SVGSVGElement;
  private itemPositionMap = new Map<TaskId, ItemPosition>();
  private outgoingArrowsMap = new Map<TaskId, Map<TaskId, SVGPathElement>>();
  private incomingArrowsMap = new Map<TaskId, Map<TaskId, SVGPathElement>>();
  private timeline: Timeline;

  setTimeline(timeline: Timeline): void {
    this.timeline = timeline;
    this.renderSVG();

    this.timeline.on('changed', () => {
      this.reCalculateItemsPositions();
      this.updateArrowsCoordinates();
    });
  }

  updateArrows(changes: DependeciesChanges): void {
    this.removeArrows(changes.remove);
    this.addArrows(changes.add);
  }

  private addArrows(tasks: Task[]): void {
    this.setItemsPositions(tasks);

    for (const task of tasks) {
      let outgoingArrows = this.outgoingArrowsMap.get(task.id);
      if (!outgoingArrows) {
        outgoingArrows = new Map<TaskId, SVGPathElement>();
        this.outgoingArrowsMap.set(task.id, outgoingArrows);
      }

      for (const child of task.dependants) {
        const start = this.itemPositionMap.get(task.id);
        const end = this.itemPositionMap.get(child.id);

        const arrow = this.createPath(this.svg);
        this.setArrowCoordinates(arrow, start, end);
        outgoingArrows.set(child.id, arrow);

        let incomingArrows = this.incomingArrowsMap.get(child.id);
        if (!incomingArrows) {
          incomingArrows = new Map<TaskId, SVGPathElement>();
          this.incomingArrowsMap.set(child.id, incomingArrows);
        }
        incomingArrows.set(task.id, arrow);
      }
    }
  }

  private setItemsPositions(tasks: Task[]): void {
    for (const task of tasks) {
      const item = this.timeline.itemSet.items[task.id];
      this.itemPositionMap.set(task.id, getItemPosition(item));
    }
  }

  private removeArrows(tasks: Task[]): void {
    for (const task of tasks) {
      // Remove outgoing arrows from the task.
      this.itemPositionMap.delete(task.id);
      const outgoingArrows = this.outgoingArrowsMap.get(task.id);
      if (!outgoingArrows) {
        continue;
      }
      for (const [childId, arrow] of outgoingArrows) {
        this.svg.removeChild(arrow);
        outgoingArrows.delete(childId);

        this.incomingArrowsMap.get(childId).delete(task.id);
      }

      // Remove incoming arrows to the task.
      const incomingArrows = this.incomingArrowsMap.get(task.id);
      if (!incomingArrows) {
        continue;
      }
      for (const [parentId, arrow] of incomingArrows) {
        this.svg.removeChild(arrow);
        incomingArrows.delete(parentId);

        this.outgoingArrowsMap.get(parentId).delete(task.id);
      }
    }
  }

  private renderSVG(): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    this.svg.style.position = 'absolute';
    this.svg.style.top = '0px';
    this.svg.style.height = '100%';
    this.svg.style.width = '100%';
    this.svg.style.display = 'block';

    this.timeline.dom.center.appendChild(this.svg);
  }

  private reCalculateItemsPositions(): void {
    for (const id of this.itemPositionMap.keys()) {
      const item: RangeItem = this.timeline.itemSet.items[id];
      const currPos = getItemPosition(item);

      /*This is to a work around the vis.js bug,
        where items fall under the timeline
        when a certain zoom limit is exceeded.*/
      if (currPos.top > 0) {
        this.itemPositionMap.set(id, currPos);
      }
    }
  }

  private setArrowCoordinates(
    arrow: SVGPathElement, start: ItemPosition, end: ItemPosition): void {
    const bezierCurve = start.height * 2;
    arrow.setAttribute(
      'd',
      `M ${start.right} ${start.midY} C ${start.right + bezierCurve} ${start.midY} ${end.left - bezierCurve} ${end.midY} ${end.left} ${end.midY}`
    );
  }

  private updateArrowsCoordinates(): void {
    for (const [parentId, children] of this.outgoingArrowsMap) {
      for (const [childId, arrow] of children) {
        const start = this.itemPositionMap.get(parentId);
        const end = this.itemPositionMap.get(childId);
        if (!start || !end || !arrow) {
          continue;
        }

        this.setArrowCoordinates(arrow, start, end);
      }
    }
  }

  private createPath(svg: SVGSVGElement): SVGPathElement {
    const somePath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    somePath.setAttribute('d', 'M 0 0');
    somePath.style.stroke = 'black';
    somePath.style.strokeWidth = '1px';
    somePath.style.fill = 'none';
    svg.appendChild(somePath);

    return somePath;
  }

}

function getItemPosition(item: RangeItem): ItemPosition {
  const leftX = item.left;
  const topY = item.parent.top + item.parent.height - item.top - item.height;
  return {
    left: leftX,
    top: topY,
    right: leftX + item.width,
    bottom: topY + item.height,
    midX: leftX + item.width / 2,
    midY: topY + item.height / 2,
    width: item.width,
    height: item.height
  };
}