import {FACE, SHELL} from 'cad/model/entities';
import {OperationRequest} from "cad/craft/craftBundle";
import {ParamsPath, WizardService} from "cad/craft/wizard/wizardTypes";
import {OperationParamPrimitive} from "cad/craft/schema/schema";
import {EntityReference} from "cad/craft/operationBundle";
import {Plugin} from "plugable/pluginSystem";
import {MarkerPluginContext} from "cad/scene/selectionMarker/markerPlugin";
import {WizardPluginContext} from "cad/craft/wizard/wizardBundle";
import {PickControlPluginContext} from "cad/scene/controls/pickControlPlugin";
import _ from "lodash";
import {MObject} from "cad/model/mobject";

export type WizardSelectionPluginInputContext = MarkerPluginContext & WizardPluginContext & PickControlPluginContext;

export interface WizardSelectionPluginContext {
}

export type WizardSelectionWorkingContext = WizardSelectionPluginInputContext & WizardSelectionPluginContext;

export const WizardSelectionPlugin: Plugin<WizardSelectionPluginInputContext, WizardSelectionPluginContext, WizardSelectionWorkingContext> = {

  inputContextSpec: {
    markerService: 'required',
    pickControlService: 'required',
    wizardService: 'required'
  },

  outputContextSpec: {
  },

  activate(ctx: WizardSelectionWorkingContext) {
    const wizardService = ctx.wizardService;
    let wizardPickHandler = null;

    function syncMarkers() {
      const marker = ctx.markerService;
      marker.startSession();
      let {schemaIndex} = wizardService.operation;
      schemaIndex.entities.forEach(entityRef => {
        //TODO: move to uiDefinition
        let color = entityRef.metadata.markColor;

        let val = wizardService.readParam(entityRef.field.path);

        if (Array.isArray(val)) {
          val.forEach(id => marker.mark(id, color));
        } else {
          if (val) {
            marker.mark(val, color);
          }
        }
      });
      marker.commit();
    }

    wizardService.workingRequest$.attach((opRequest: OperationRequest) => {
      ctx.markerService.clear();
      if (opRequest) {
        if (wizardPickHandler === null) {
          wizardPickHandler = createPickHandlerFromSchema(wizardService);
          const token = ctx.pickControlService.takePickControl(wizardPickHandler, syncMarkers);
          ctx.wizardService.addDisposer(() => {
            wizardPickHandler = null;
            ctx.pickControlService.releasePickControl(token);
          });
        }

        syncMarkers();
      }
    });
  },

}

function createPickHandlerFromSchema(wizardService: WizardService) {
  function updateSingle(param: ParamsPath, value: OperationParamPrimitive) {
    wizardService.updateParam(param, value);
  }

  function updateMulti(param: ParamsPath, value: OperationParamPrimitive) {
    wizardService.updateParams(params => {
      const currVal = _.get(params, param);
      if (!currVal) {
        _.set(params, param, [value]);
      } else {
        const arr: OperationParamPrimitive[] = Array.isArray(currVal) ? currVal : [currVal];
        if (arr.indexOf(value) === -1) {
          arr.push(value);
        }
      }
    });
  }
  return model => {
    const modelType = model.TYPE;

    let {schemaIndex} = wizardService.operation;
    let activeEntityRef = () => {
      const state = wizardService.state$.value;
      return schemaIndex.entitiesByFlattenedPaths[state.activeParam];
    }


    function activeCanTakeIt(model: MObject) {
      let activeRef: EntityReference = activeEntityRef();
      if (!activeRef) {
        return false;
      }
      const activeMd = activeRef?.metadata;
      return activeMd && activeMd.entityCapture(model);
    }

    function select(entityRef: EntityReference, id: string) {
      const param = entityRef.field;
      if (entityRef.isArray) {
        updateMulti(param.path, id);
      } else {
        updateSingle(param.path, id);
      }
      let paramToMakeActive = getNextActiveParam(entityRef);
      wizardService.updateState(state => {
        state.activeParam = paramToMakeActive.field.flattenedPath
      });
    }

    function getNextActiveParam(entityRef: EntityReference): EntityReference {
      // if (!entityRef.isArray && entityRef.metadata.cycleSelection) {
      //   const index = schemaIndex.entities.indexOf(entityRef);
      //   const nextIndex = (index + 1) % schemaIndex.entities.length;
      //   return schemaIndex.entities[nextIndex];
      // }
      return entityRef;
    }
    
    function selectActive(id: string) {
      select(activeEntityRef(),  id);
    }

    function selectToFirst(entity) {
      for (let eRef of schemaIndex.entities) {
        if (eRef.metadata.entityCapture(entity)) {
          select(eRef, entity.id);
          return true;
        }
      }
      return false;
    }

    function deselectIfNeeded(id) {
      for (let entityRef of schemaIndex.entities) {
        let val = wizardService.readParam(entityRef.field.path);

        if (val === id) {
          updateSingle(entityRef.field.path, undefined);
          wizardService.updateState(state => {
            state.activeParam = entityRef.field.flattenedPath
          });
          return true;
        } else if (Array.isArray(val)) {
          let index = val.indexOf(id);
          if (index !== -1) {
            wizardService.updateParams(params => {
              const val = _.get(params, entityRef.field.path);
              let index = val.indexOf(id);
              val.splice(index, 1);
            });
            wizardService.updateState(state => {
              state.activeParam = entityRef.field.flattenedPath
            });
            return true;
          }
        }
      }
    }

    if (deselectIfNeeded(model.id)) {
      return false;
    } else if (model.shell) {
      if (deselectIfNeeded(model.shell.id)) {
        return false;
      }
    }
    
    if (modelType === FACE) {
      if (activeCanTakeIt(model.shell)) {
        selectActive(model.shell.id);
      } else if (activeCanTakeIt(model)) {
        selectActive(model.id);
      } else {
        // if (!selectToFirst(model)) {
        //   selectToFirst(model.shell)
        // }
      }
    } else{
      if (activeCanTakeIt(model)) {
        selectActive(model.id);
      } else {
        // selectToFirst(model);
      }
    }
    return false;
  };
}

