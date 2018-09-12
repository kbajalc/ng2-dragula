/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
import { Injectable, Optional } from '@angular/core';
import { Group } from '../Group';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EventTypes, AllEvents } from '../EventTypes';
import { DrakeFactory } from '../DrakeFactory';
/** @type {?} */
const filterEvent = (eventType, filterDragType, projector) => (input) => {
    return input.pipe(filter(({ event, name }) => {
        return event === eventType
            && (filterDragType === undefined || name === filterDragType);
    }), map(({ name, args }) => projector(name, args)));
};
const ɵ0 = filterEvent;
/** @type {?} */
const elContainerSourceProjector = (name, [el, container, source]) => ({ name, el, container, source });
const ɵ1 = elContainerSourceProjector;
export class DragulaService {
    /**
     * @param {?=} drakeFactory
     */
    constructor(drakeFactory = null) {
        this.drakeFactory = drakeFactory;
        this.dispatch$ = new Subject();
        this.drag = (groupName) => this.dispatch$.pipe(filterEvent(EventTypes.Drag, groupName, (name, [el, source]) => ({ name, el, source })));
        this.dragend = (groupName) => this.dispatch$.pipe(filterEvent(EventTypes.DragEnd, groupName, (name, [el]) => ({ name, el })));
        this.drop = (groupName) => this.dispatch$.pipe(filterEvent(EventTypes.Drop, groupName, (name, [el, target, source, sibling]) => {
            return { name, el, target, source, sibling };
        }));
        this.elContainerSource = (eventType) => (groupName) => this.dispatch$.pipe(filterEvent(eventType, groupName, elContainerSourceProjector));
        this.cancel = this.elContainerSource(EventTypes.Cancel);
        this.remove = this.elContainerSource(EventTypes.Remove);
        this.shadow = this.elContainerSource(EventTypes.Shadow);
        this.over = this.elContainerSource(EventTypes.Over);
        this.out = this.elContainerSource(EventTypes.Out);
        this.cloned = (groupName) => this.dispatch$.pipe(filterEvent(EventTypes.Cloned, groupName, (name, [clone, original, cloneType]) => {
            return { name, clone, original, cloneType };
        }));
        this.dropModel = (groupName) => this.dispatch$.pipe(filterEvent(EventTypes.DropModel, groupName, (name, [el, target, source, sibling, item, sourceModel, targetModel, sourceIndex, targetIndex]) => {
            return { name, el, target, source, sibling, item, sourceModel, targetModel, sourceIndex, targetIndex };
        }));
        this.removeModel = (groupName) => this.dispatch$.pipe(filterEvent(EventTypes.RemoveModel, groupName, (name, [el, container, source, item, sourceModel, sourceIndex]) => {
            return { name, el, container, source, item, sourceModel, sourceIndex };
        }));
        this.groups = {};
        if (this.drakeFactory === null) {
            this.drakeFactory = new DrakeFactory();
        }
    }
    /**
     * Public mainly for testing purposes. Prefer `createGroup()`.
     * @param {?} group
     * @return {?}
     */
    add(group) {
        /** @type {?} */
        let existingGroup = this.find(group.name);
        if (existingGroup) {
            throw new Error('Group named: "' + group.name + '" already exists.');
        }
        this.groups[group.name] = group;
        this.handleModels(group);
        this.setupEvents(group);
        return group;
    }
    /**
     * @param {?} name
     * @return {?}
     */
    find(name) {
        return this.groups[name];
    }
    /**
     * @param {?} name
     * @return {?}
     */
    destroy(name) {
        /** @type {?} */
        let group = this.find(name);
        if (!group) {
            return;
        }
        group.drake && group.drake.destroy();
        delete this.groups[name];
    }
    /**
     * Creates a group with the specified name and options.
     *
     * Note: formerly known as `setOptions`
     * @template T
     * @param {?} name
     * @param {?} options
     * @return {?}
     */
    createGroup(name, options) {
        return this.add(new Group(name, this.drakeFactory.build([], options), options));
    }
    /**
     * @param {?} __0
     * @return {?}
     */
    handleModels({ name, drake, options }) {
        /** @type {?} */
        let dragElm;
        /** @type {?} */
        let dragIndex;
        /** @type {?} */
        let dropIndex;
        drake.on('remove', (el, container, source) => {
            if (!drake.models) {
                return;
            }
            /** @type {?} */
            let sourceModel = drake.models[drake.containers.indexOf(source)];
            sourceModel = sourceModel.slice(0);
            /** @type {?} */
            const item = sourceModel.splice(dragIndex, 1)[0];
            // console.log('REMOVE');
            // console.log(sourceModel);
            this.dispatch$.next({
                event: EventTypes.RemoveModel,
                name,
                args: [el, container, source, item, sourceModel, dragIndex]
            });
        });
        drake.on('drag', (el, source) => {
            if (!drake.models) {
                return;
            }
            dragElm = el;
            dragIndex = this.domIndexOf(el, source);
        });
        drake.on('drop', (dropElm, target, source, sibling) => {
            if (!drake.models || !target) {
                return;
            }
            dropIndex = this.domIndexOf(dropElm, target);
            /** @type {?} */
            let sourceModel = drake.models[drake.containers.indexOf(source)];
            /** @type {?} */
            let targetModel = drake.models[drake.containers.indexOf(target)];
            /** @type {?} */
            let item;
            /** @type {?} */
            let isCopying = dragElm !== dropElm;
            if (target === source && !isCopying) {
                sourceModel = sourceModel.slice(0);
                item = sourceModel.splice(dragIndex, 1)[0];
                sourceModel.splice(dropIndex, 0, item);
                // this was true before we cloned and updated sourceModel,
                // but targetModel still has the old value
                targetModel = sourceModel;
            }
            else {
                item = sourceModel[dragIndex];
                if (isCopying) {
                    if (!options.copyItem) {
                        throw new Error("If you have enabled `copy` on a group, you must provide a `copyItem` function.");
                    }
                    item = options.copyItem(item);
                }
                if (!isCopying) {
                    sourceModel = sourceModel.slice(0);
                    sourceModel.splice(dragIndex, 1);
                }
                targetModel = targetModel.slice(0);
                targetModel.splice(dropIndex, 0, item);
                if (isCopying) {
                    try {
                        target.removeChild(dropElm);
                    }
                    catch (e) { }
                }
            }
            this.dispatch$.next({
                event: EventTypes.DropModel,
                name,
                args: [dropElm, target, source, sibling, item, sourceModel, targetModel, dragIndex, dropIndex]
            });
        });
    }
    /**
     * @param {?} group
     * @return {?}
     */
    setupEvents(group) {
        if (group.initEvents) {
            return;
        }
        group.initEvents = true;
        /** @type {?} */
        const name = group.name;
        /** @type {?} */
        let that = this;
        /** @type {?} */
        let emitter = (event) => {
            group.drake.on(event, (...args) => {
                this.dispatch$.next({ event, name, args });
            });
        };
        AllEvents.forEach(emitter);
    }
    /**
     * @param {?} child
     * @param {?} parent
     * @return {?}
     */
    domIndexOf(child, parent) {
        return Array.prototype.indexOf.call(parent.children, child);
    }
}
DragulaService.decorators = [
    { type: Injectable }
];
/** @nocollapse */
DragulaService.ctorParameters = () => [
    { type: DrakeFactory, decorators: [{ type: Optional }] }
];
function DragulaService_tsickle_Closure_declarations() {
    /** @type {?} */
    DragulaService.prototype.dispatch$;
    /** @type {?} */
    DragulaService.prototype.drag;
    /** @type {?} */
    DragulaService.prototype.dragend;
    /** @type {?} */
    DragulaService.prototype.drop;
    /** @type {?} */
    DragulaService.prototype.elContainerSource;
    /** @type {?} */
    DragulaService.prototype.cancel;
    /** @type {?} */
    DragulaService.prototype.remove;
    /** @type {?} */
    DragulaService.prototype.shadow;
    /** @type {?} */
    DragulaService.prototype.over;
    /** @type {?} */
    DragulaService.prototype.out;
    /** @type {?} */
    DragulaService.prototype.cloned;
    /** @type {?} */
    DragulaService.prototype.dropModel;
    /** @type {?} */
    DragulaService.prototype.removeModel;
    /** @type {?} */
    DragulaService.prototype.groups;
    /** @type {?} */
    DragulaService.prototype.drakeFactory;
}
export { ɵ0, ɵ1 };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhZ3VsYS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmcyLWRyYWd1bGEvIiwic291cmNlcyI6WyJjb21wb25lbnRzL2RyYWd1bGEuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVqQyxPQUFPLEVBQUUsT0FBTyxFQUFjLE1BQU0sTUFBTSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDOztBQUsvQyxNQUFNLFdBQVcsR0FBRyxDQUNsQixTQUFxQixFQUNyQixjQUFrQyxFQUNsQyxTQUE2QixFQUM3QixFQUFFLENBQUMsQ0FBQyxLQUEyQixFQUFpQixFQUFFO0lBQ2xELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNmLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7UUFDekIsTUFBTSxDQUFDLEtBQUssS0FBSyxTQUFTO2VBQ3JCLENBQUMsY0FBYyxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssY0FBYyxDQUFDLENBQUM7S0FDaEUsQ0FBQyxFQUNGLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQy9DLENBQUM7Q0FDSCxDQUFBOzs7QUFFRCxNQUFNLDBCQUEwQixHQUM5QixDQUFDLElBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUE4QixFQUFF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QVc7UUFDeEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDOzs7O1lBeE4vRCxVQUFVOzs7O1lBdkJGLFlBQVksdUJBMEdOLFFBQVEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlLCBPcHRpb25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgR3JvdXAgfSBmcm9tICcuLi9Hcm91cCc7XG5pbXBvcnQgeyBEcmFndWxhT3B0aW9ucyB9IGZyb20gJy4uL0RyYWd1bGFPcHRpb25zJztcbmltcG9ydCB7IFN1YmplY3QsIE9ic2VydmFibGUgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGZpbHRlciwgbWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgRXZlbnRUeXBlcywgQWxsRXZlbnRzIH0gZnJvbSAnLi4vRXZlbnRUeXBlcyc7XG5pbXBvcnQgeyBEcmFrZUZhY3RvcnkgfSBmcm9tICcuLi9EcmFrZUZhY3RvcnknO1xuXG50eXBlIEZpbHRlclByb2plY3RvcjxUIGV4dGVuZHMgeyBuYW1lOiBzdHJpbmc7IH0+ID0gKG5hbWU6IHN0cmluZywgYXJnczogYW55W10pID0+IFQ7XG50eXBlIERpc3BhdGNoID0geyBldmVudDogRXZlbnRUeXBlczsgbmFtZTogc3RyaW5nOyBhcmdzOiBhbnlbXTsgfTtcblxuY29uc3QgZmlsdGVyRXZlbnQgPSA8VCBleHRlbmRzIHsgbmFtZTogc3RyaW5nOyB9PihcbiAgZXZlbnRUeXBlOiBFdmVudFR5cGVzLFxuICBmaWx0ZXJEcmFnVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBwcm9qZWN0b3I6IEZpbHRlclByb2plY3RvcjxUPlxuKSA9PiAoaW5wdXQ6IE9ic2VydmFibGU8RGlzcGF0Y2g+KTogT2JzZXJ2YWJsZTxUPiA9PiB7XG4gIHJldHVybiBpbnB1dC5waXBlKFxuICAgIGZpbHRlcigoeyBldmVudCwgbmFtZSB9KSA9PiB7XG4gICAgICByZXR1cm4gZXZlbnQgPT09IGV2ZW50VHlwZVxuICAgICAgICAmJiAoZmlsdGVyRHJhZ1R5cGUgPT09IHVuZGVmaW5lZCB8fCBuYW1lID09PSBmaWx0ZXJEcmFnVHlwZSk7XG4gICAgfSksXG4gICAgbWFwKCh7IG5hbWUsIGFyZ3MgfSkgPT4gcHJvamVjdG9yKG5hbWUsIGFyZ3MpKVxuICApO1xufVxuXG5jb25zdCBlbENvbnRhaW5lclNvdXJjZVByb2plY3RvciA9XG4gIChuYW1lOiBzdHJpbmcsIFtlbCwgY29udGFpbmVyLCBzb3VyY2VdOiBbRWxlbWVudCwgRWxlbWVudCwgRWxlbWVudF0pID0+XG4gICAgKHsgbmFtZSwgZWwsIGNvbnRhaW5lciwgc291cmNlIH0pO1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgRHJhZ3VsYVNlcnZpY2Uge1xuXG4gIC8qIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXZhY3F1YS9kcmFndWxhI2RyYWtlb24tZXZlbnRzICovXG5cbiAgcHJpdmF0ZSBkaXNwYXRjaCQgPSBuZXcgU3ViamVjdDxEaXNwYXRjaD4oKTtcblxuICBwdWJsaWMgZHJhZyA9IChncm91cE5hbWU/OiBzdHJpbmcpID0+IHRoaXMuZGlzcGF0Y2gkLnBpcGUoXG4gICAgZmlsdGVyRXZlbnQoXG4gICAgICBFdmVudFR5cGVzLkRyYWcsXG4gICAgICBncm91cE5hbWUsXG4gICAgICAobmFtZSwgW2VsLCBzb3VyY2VdOiBbRWxlbWVudCwgRWxlbWVudF0pID0+ICh7IG5hbWUsIGVsLCBzb3VyY2UgfSlcbiAgICApXG4gICk7XG5cbiAgcHVibGljIGRyYWdlbmQgPSAoZ3JvdXBOYW1lPzogc3RyaW5nKSA9PiB0aGlzLmRpc3BhdGNoJC5waXBlKFxuICAgIGZpbHRlckV2ZW50KFxuICAgICAgRXZlbnRUeXBlcy5EcmFnRW5kLFxuICAgICAgZ3JvdXBOYW1lLFxuICAgICAgKG5hbWUsIFtlbF06IFtFbGVtZW50XSkgPT4gKHsgbmFtZSwgZWwgfSlcbiAgICApXG4gICk7XG5cbiAgcHVibGljIGRyb3AgPSAoZ3JvdXBOYW1lPzogc3RyaW5nKSA9PiB0aGlzLmRpc3BhdGNoJC5waXBlKFxuICAgIGZpbHRlckV2ZW50KFxuICAgICAgRXZlbnRUeXBlcy5Ecm9wLFxuICAgICAgZ3JvdXBOYW1lLFxuICAgICAgKG5hbWUsIFtcbiAgICAgICAgZWwsIHRhcmdldCwgc291cmNlLCBzaWJsaW5nXG4gICAgICBdOiBbRWxlbWVudCwgRWxlbWVudCwgRWxlbWVudCwgRWxlbWVudF0pID0+IHtcbiAgICAgICAgcmV0dXJuIHsgbmFtZSwgZWwsIHRhcmdldCwgc291cmNlLCBzaWJsaW5nIH07XG4gICAgICB9KVxuICApO1xuXG4gIHByaXZhdGUgZWxDb250YWluZXJTb3VyY2UgPVxuICAgIChldmVudFR5cGU6IEV2ZW50VHlwZXMpID0+XG4gICAgICAoZ3JvdXBOYW1lPzogc3RyaW5nKSA9PlxuICAgICAgICB0aGlzLmRpc3BhdGNoJC5waXBlKFxuICAgICAgICAgIGZpbHRlckV2ZW50KGV2ZW50VHlwZSwgZ3JvdXBOYW1lLCBlbENvbnRhaW5lclNvdXJjZVByb2plY3RvcilcbiAgICAgICAgKTtcblxuICBwdWJsaWMgY2FuY2VsID0gdGhpcy5lbENvbnRhaW5lclNvdXJjZShFdmVudFR5cGVzLkNhbmNlbCk7XG4gIHB1YmxpYyByZW1vdmUgPSB0aGlzLmVsQ29udGFpbmVyU291cmNlKEV2ZW50VHlwZXMuUmVtb3ZlKTtcbiAgcHVibGljIHNoYWRvdyA9IHRoaXMuZWxDb250YWluZXJTb3VyY2UoRXZlbnRUeXBlcy5TaGFkb3cpO1xuICBwdWJsaWMgb3ZlciA9IHRoaXMuZWxDb250YWluZXJTb3VyY2UoRXZlbnRUeXBlcy5PdmVyKTtcbiAgcHVibGljIG91dCA9IHRoaXMuZWxDb250YWluZXJTb3VyY2UoRXZlbnRUeXBlcy5PdXQpO1xuXG4gIHB1YmxpYyBjbG9uZWQgPSAoZ3JvdXBOYW1lPzogc3RyaW5nKSA9PiB0aGlzLmRpc3BhdGNoJC5waXBlKFxuICAgIGZpbHRlckV2ZW50KFxuICAgICAgRXZlbnRUeXBlcy5DbG9uZWQsXG4gICAgICBncm91cE5hbWUsXG4gICAgICAobmFtZSwgW1xuICAgICAgICBjbG9uZSwgb3JpZ2luYWwsIGNsb25lVHlwZVxuICAgICAgXTogW0VsZW1lbnQsIEVsZW1lbnQsICdtaXJyb3InIHwgJ2NvcHknXSkgPT4ge1xuICAgICAgICByZXR1cm4geyBuYW1lLCBjbG9uZSwgb3JpZ2luYWwsIGNsb25lVHlwZSB9XG4gICAgICB9KVxuICApO1xuXG4gIHB1YmxpYyBkcm9wTW9kZWwgPSA8VCA9IGFueT4oZ3JvdXBOYW1lPzogc3RyaW5nKSA9PiB0aGlzLmRpc3BhdGNoJC5waXBlKFxuICAgIGZpbHRlckV2ZW50KFxuICAgICAgRXZlbnRUeXBlcy5Ecm9wTW9kZWwsXG4gICAgICBncm91cE5hbWUsXG4gICAgICAobmFtZSwgW1xuICAgICAgICBlbCwgdGFyZ2V0LCBzb3VyY2UsIHNpYmxpbmcsIGl0ZW0sIHNvdXJjZU1vZGVsLCB0YXJnZXRNb2RlbCwgc291cmNlSW5kZXgsIHRhcmdldEluZGV4XG4gICAgICBdOiBbRWxlbWVudCwgRWxlbWVudCwgRWxlbWVudCwgRWxlbWVudCwgVCwgVFtdLCBUW10sIG51bWJlciwgbnVtYmVyXSkgPT4ge1xuICAgICAgICByZXR1cm4geyBuYW1lLCBlbCwgdGFyZ2V0LCBzb3VyY2UsIHNpYmxpbmcsIGl0ZW0sIHNvdXJjZU1vZGVsLCB0YXJnZXRNb2RlbCwgc291cmNlSW5kZXgsIHRhcmdldEluZGV4IH1cbiAgICAgIH0pXG4gICk7XG5cbiAgcHVibGljIHJlbW92ZU1vZGVsID0gPFQgPSBhbnk+KGdyb3VwTmFtZT86IHN0cmluZykgPT4gdGhpcy5kaXNwYXRjaCQucGlwZShcbiAgICBmaWx0ZXJFdmVudChcbiAgICAgIEV2ZW50VHlwZXMuUmVtb3ZlTW9kZWwsXG4gICAgICBncm91cE5hbWUsXG4gICAgICAobmFtZSwgW1xuICAgICAgICBlbCwgY29udGFpbmVyLCBzb3VyY2UsIGl0ZW0sIHNvdXJjZU1vZGVsLCBzb3VyY2VJbmRleFxuICAgICAgXTogW0VsZW1lbnQsIEVsZW1lbnQsIEVsZW1lbnQsIFQsIFRbXSwgbnVtYmVyXSkgPT4ge1xuICAgICAgICByZXR1cm4geyBuYW1lLCBlbCwgY29udGFpbmVyLCBzb3VyY2UsIGl0ZW0sIHNvdXJjZU1vZGVsLCBzb3VyY2VJbmRleCB9XG4gICAgICB9XG4gICAgKVxuICApO1xuXG4gIHByaXZhdGUgZ3JvdXBzOiB7IFtrOiBzdHJpbmddOiBHcm91cCB9ID0ge307XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgcHJpdmF0ZSBkcmFrZUZhY3Rvcnk6IERyYWtlRmFjdG9yeSA9IG51bGwpIHtcbiAgICBpZiAodGhpcy5kcmFrZUZhY3RvcnkgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuZHJha2VGYWN0b3J5ID0gbmV3IERyYWtlRmFjdG9yeSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBQdWJsaWMgbWFpbmx5IGZvciB0ZXN0aW5nIHB1cnBvc2VzLiBQcmVmZXIgYGNyZWF0ZUdyb3VwKClgLiAqL1xuICBwdWJsaWMgYWRkKGdyb3VwOiBHcm91cCk6IEdyb3VwIHtcbiAgICBsZXQgZXhpc3RpbmdHcm91cCA9IHRoaXMuZmluZChncm91cC5uYW1lKTtcbiAgICBpZiAoZXhpc3RpbmdHcm91cCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdHcm91cCBuYW1lZDogXCInICsgZ3JvdXAubmFtZSArICdcIiBhbHJlYWR5IGV4aXN0cy4nKTtcbiAgICB9XG4gICAgdGhpcy5ncm91cHNbZ3JvdXAubmFtZV0gPSBncm91cDtcbiAgICB0aGlzLmhhbmRsZU1vZGVscyhncm91cCk7XG4gICAgdGhpcy5zZXR1cEV2ZW50cyhncm91cCk7XG4gICAgcmV0dXJuIGdyb3VwO1xuICB9XG5cbiAgcHVibGljIGZpbmQobmFtZTogc3RyaW5nKTogR3JvdXAge1xuICAgIHJldHVybiB0aGlzLmdyb3Vwc1tuYW1lXTtcbiAgfVxuXG4gIHB1YmxpYyBkZXN0cm95KG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIGxldCBncm91cCA9IHRoaXMuZmluZChuYW1lKTtcbiAgICBpZiAoIWdyb3VwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGdyb3VwLmRyYWtlICYmIGdyb3VwLmRyYWtlLmRlc3Ryb3koKTtcbiAgICBkZWxldGUgdGhpcy5ncm91cHNbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGdyb3VwIHdpdGggdGhlIHNwZWNpZmllZCBuYW1lIGFuZCBvcHRpb25zLlxuICAgKlxuICAgKiBOb3RlOiBmb3JtZXJseSBrbm93biBhcyBgc2V0T3B0aW9uc2BcbiAgICovXG4gIHB1YmxpYyBjcmVhdGVHcm91cDxUID0gYW55PihuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IERyYWd1bGFPcHRpb25zPFQ+KTogR3JvdXAge1xuICAgIHJldHVybiB0aGlzLmFkZChuZXcgR3JvdXAoXG4gICAgICBuYW1lLFxuICAgICAgdGhpcy5kcmFrZUZhY3RvcnkuYnVpbGQoW10sIG9wdGlvbnMpLFxuICAgICAgb3B0aW9uc1xuICAgICkpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVNb2RlbHMoeyBuYW1lLCBkcmFrZSwgb3B0aW9ucyB9OiBHcm91cCk6IHZvaWQge1xuICAgIGxldCBkcmFnRWxtOiBhbnk7XG4gICAgbGV0IGRyYWdJbmRleDogbnVtYmVyO1xuICAgIGxldCBkcm9wSW5kZXg6IG51bWJlcjtcbiAgICBkcmFrZS5vbigncmVtb3ZlJywgKGVsOiBhbnksIGNvbnRhaW5lcjogYW55LCBzb3VyY2U6IGFueSkgPT4ge1xuICAgICAgaWYgKCFkcmFrZS5tb2RlbHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbGV0IHNvdXJjZU1vZGVsID0gZHJha2UubW9kZWxzW2RyYWtlLmNvbnRhaW5lcnMuaW5kZXhPZihzb3VyY2UpXTtcbiAgICAgIHNvdXJjZU1vZGVsID0gc291cmNlTW9kZWwuc2xpY2UoMCk7IC8vIGNsb25lIGl0XG4gICAgICBjb25zdCBpdGVtID0gc291cmNlTW9kZWwuc3BsaWNlKGRyYWdJbmRleCwgMSlbMF07XG4gICAgICAvLyBjb25zb2xlLmxvZygnUkVNT1ZFJyk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhzb3VyY2VNb2RlbCk7XG4gICAgICB0aGlzLmRpc3BhdGNoJC5uZXh0KHtcbiAgICAgICAgZXZlbnQ6IEV2ZW50VHlwZXMuUmVtb3ZlTW9kZWwsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGFyZ3M6IFtlbCwgY29udGFpbmVyLCBzb3VyY2UsIGl0ZW0sIHNvdXJjZU1vZGVsLCBkcmFnSW5kZXhdXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBkcmFrZS5vbignZHJhZycsIChlbDogYW55LCBzb3VyY2U6IGFueSkgPT4ge1xuICAgICAgaWYgKCFkcmFrZS5tb2RlbHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZHJhZ0VsbSA9IGVsO1xuICAgICAgZHJhZ0luZGV4ID0gdGhpcy5kb21JbmRleE9mKGVsLCBzb3VyY2UpO1xuICAgIH0pO1xuICAgIGRyYWtlLm9uKCdkcm9wJywgKGRyb3BFbG06IGFueSwgdGFyZ2V0OiBFbGVtZW50LCBzb3VyY2U6IEVsZW1lbnQsIHNpYmxpbmc/OiBFbGVtZW50KSA9PiB7XG4gICAgICBpZiAoIWRyYWtlLm1vZGVscyB8fCAhdGFyZ2V0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGRyb3BJbmRleCA9IHRoaXMuZG9tSW5kZXhPZihkcm9wRWxtLCB0YXJnZXQpO1xuICAgICAgbGV0IHNvdXJjZU1vZGVsID0gZHJha2UubW9kZWxzW2RyYWtlLmNvbnRhaW5lcnMuaW5kZXhPZihzb3VyY2UpXTtcbiAgICAgIGxldCB0YXJnZXRNb2RlbCA9IGRyYWtlLm1vZGVsc1tkcmFrZS5jb250YWluZXJzLmluZGV4T2YodGFyZ2V0KV07XG4gICAgICAvLyBjb25zb2xlLmxvZygnRFJPUCcpO1xuICAgICAgLy8gY29uc29sZS5sb2coc291cmNlTW9kZWwpO1xuICAgICAgbGV0IGl0ZW06IGFueTtcbiAgICAgIGxldCBpc0NvcHlpbmcgPSBkcmFnRWxtICE9PSBkcm9wRWxtO1xuICAgICAgaWYgKHRhcmdldCA9PT0gc291cmNlICYmICFpc0NvcHlpbmcpIHtcbiAgICAgICAgc291cmNlTW9kZWwgPSBzb3VyY2VNb2RlbC5zbGljZSgwKVxuICAgICAgICBpdGVtID0gc291cmNlTW9kZWwuc3BsaWNlKGRyYWdJbmRleCwgMSlbMF07XG4gICAgICAgIHNvdXJjZU1vZGVsLnNwbGljZShkcm9wSW5kZXgsIDAsIGl0ZW0pO1xuICAgICAgICAvLyB0aGlzIHdhcyB0cnVlIGJlZm9yZSB3ZSBjbG9uZWQgYW5kIHVwZGF0ZWQgc291cmNlTW9kZWwsXG4gICAgICAgIC8vIGJ1dCB0YXJnZXRNb2RlbCBzdGlsbCBoYXMgdGhlIG9sZCB2YWx1ZVxuICAgICAgICB0YXJnZXRNb2RlbCA9IHNvdXJjZU1vZGVsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXRlbSA9IHNvdXJjZU1vZGVsW2RyYWdJbmRleF07XG4gICAgICAgIGlmIChpc0NvcHlpbmcpIHtcbiAgICAgICAgICBpZiAoIW9wdGlvbnMuY29weUl0ZW0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIklmIHlvdSBoYXZlIGVuYWJsZWQgYGNvcHlgIG9uIGEgZ3JvdXAsIHlvdSBtdXN0IHByb3ZpZGUgYSBgY29weUl0ZW1gIGZ1bmN0aW9uLlwiKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtID0gb3B0aW9ucy5jb3B5SXRlbShpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNDb3B5aW5nKSB7XG4gICAgICAgICAgc291cmNlTW9kZWwgPSBzb3VyY2VNb2RlbC5zbGljZSgwKVxuICAgICAgICAgIHNvdXJjZU1vZGVsLnNwbGljZShkcmFnSW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldE1vZGVsID0gdGFyZ2V0TW9kZWwuc2xpY2UoMClcbiAgICAgICAgdGFyZ2V0TW9kZWwuc3BsaWNlKGRyb3BJbmRleCwgMCwgaXRlbSk7XG4gICAgICAgIGlmIChpc0NvcHlpbmcpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGFyZ2V0LnJlbW92ZUNoaWxkKGRyb3BFbG0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmRpc3BhdGNoJC5uZXh0KHtcbiAgICAgICAgZXZlbnQ6IEV2ZW50VHlwZXMuRHJvcE1vZGVsLFxuICAgICAgICBuYW1lLFxuICAgICAgICBhcmdzOiBbZHJvcEVsbSwgdGFyZ2V0LCBzb3VyY2UsIHNpYmxpbmcsIGl0ZW0sIHNvdXJjZU1vZGVsLCB0YXJnZXRNb2RlbCwgZHJhZ0luZGV4LCBkcm9wSW5kZXhdXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBFdmVudHMoZ3JvdXA6IEdyb3VwKTogdm9pZCB7XG4gICAgaWYgKGdyb3VwLmluaXRFdmVudHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZ3JvdXAuaW5pdEV2ZW50cyA9IHRydWU7XG4gICAgY29uc3QgbmFtZSA9IGdyb3VwLm5hbWU7XG4gICAgbGV0IHRoYXQ6IGFueSA9IHRoaXM7XG4gICAgbGV0IGVtaXR0ZXIgPSAoZXZlbnQ6IEV2ZW50VHlwZXMpID0+IHtcbiAgICAgIGdyb3VwLmRyYWtlLm9uKGV2ZW50LCAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCQubmV4dCh7IGV2ZW50LCBuYW1lLCBhcmdzIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICBBbGxFdmVudHMuZm9yRWFjaChlbWl0dGVyKTtcbiAgfVxuXG4gIHByaXZhdGUgZG9tSW5kZXhPZihjaGlsZDogYW55LCBwYXJlbnQ6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwocGFyZW50LmNoaWxkcmVuLCBjaGlsZCk7XG4gIH1cbn1cbiJdfQ==