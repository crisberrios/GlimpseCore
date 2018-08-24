import { Action, combineReducers } from 'redux';

import { toBoolean } from 'common/util/StringUtilities';
import { getOriginalQueryStringParam } from 'common/util/UrlUtilities';
import { IStorePersistedRequestsState } from 'client/IStoreState';
import { IRequestPersistedState } from './RequestsInterfaces';

import {
    detailsPersistedReducer,
    detailsPersistedRequestReducer
} from './details/RequestsDetailsReducer';
import expansion from './components/expansion/ExpansionReducers';
import filter from './RequestsFilterReducer';
import {
    toggleFollowModeAction,
    disableFollowModeAction,
    toggleFilterModeAction,
    purgeOldRequestsAction
} from './RequestsActions';
import { storeInitAction } from 'client/StoreActions';
import { purgeOldRecords } from 'common/util/ReducerUtilities';

let defaultFollowMode = toBoolean(getOriginalQueryStringParam('follow'));

/**
 * Intended for TESTING only.
 * @param value that should be set
 */
export function updateDefaultFollowMode(value: boolean) {
    defaultFollowMode = value;
}

export function followModeReducer(state: boolean = defaultFollowMode, action: Action): boolean {
    switch (action.type) {
        case storeInitAction.type:
            return defaultFollowMode !== undefined ? defaultFollowMode : !!state;
        case toggleFollowModeAction.type:
            // just flip the bit
            return !state;
        case disableFollowModeAction.type:
            // explict disable
            return false;
        default:
            return !!state;
    }
}

export function filterModeReducer(state: boolean = false, action: Action): boolean {
    switch (action.type) {
        case toggleFilterModeAction.type:
            return !state;
        default:
            return state;
    }
}

/**
 * The reducer for the persisted data that is not request-specific
 */
export const requestsPersistedReducer = combineReducers({
    details: detailsPersistedReducer,
    filter,
    followMode: followModeReducer,
    filterMode: filterModeReducer
});

/**
 * The reducer for the persisted data for a specific request
 */
const requestPersistedRequestReducer = combineReducers<IRequestPersistedState>({
    details: detailsPersistedRequestReducer,
    expansion
});

/**
 * Represents a request-specific action
 *
 * NOTE: Any action which results in persisted data that is request-specific must include requestId in its payload.
 */
interface IRequestAction extends Action {
    /**
     * The payload of the action
     */
    payload?: {
        /**
         * The ID corresponding to the request associated with this action
         */
        requestId?: string;
    };
}

export const INITIAL_STATE = {
    added: undefined,
    updated: undefined,
    state: {
        details: {
            service: {
                selectedExhangeId: undefined
            },
            data: {
                selectedExhangeId: undefined
            },
            timeline: {
                selectedOffsets: {
                    minOffset: undefined,
                    maxOffset: undefined,
                    segment: undefined
                }
            }
        },
        expansion: {
            elements: {}
        }
    }
};

/**
 * The reducer for the persisted data of all requests. NOTE, this reducer does not
 * attempt to purge old requests.
 *
 * @param state The previous state
 * @param action The action being performed
 *
 * @returns The new state generated by the performed action, or the previous state
 */
export function rawRequestsPersistedRequestReducer(
    state: IStorePersistedRequestsState = {},
    action: IRequestAction
): IStorePersistedRequestsState {
    const requestId = action && action.payload && action.payload.requestId;

    if (requestId) {
        const timestamp = new Date().getTime();

        const prevState = state[requestId] || {
            ...INITIAL_STATE,
            added: timestamp,
            updated: timestamp
        };

        const newState = requestPersistedRequestReducer(prevState.state, action);

        if (newState !== prevState.state) {
            return {
                ...state,
                [requestId]: {
                    ...prevState,
                    state: newState,
                    updated: timestamp
                }
            };
        }
    }

    return state;
}

/**
 * The reducer for the persisted data of all requests. NOTE, this reducer will
 * purge old requests
 *
 * @param state The previous state
 * @param action The action being performed
 *
 * @returns The new state generated by the performed action, or the previous state
 */
export function requestsPersistedRequestReducer(
    state: IStorePersistedRequestsState = {},
    action: IRequestAction
): IStorePersistedRequestsState {
    const result = rawRequestsPersistedRequestReducer(state, action);

    return action.type === purgeOldRequestsAction.type ? purgeOldRecords(result) : result;
}



// WEBPACK FOOTER //
// ./src/client/routes/requests/RequestsReducers.ts