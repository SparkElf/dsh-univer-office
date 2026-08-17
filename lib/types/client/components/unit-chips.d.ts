import * as React from 'react';
import type { ChangedUnit } from '../../shared/wire/state.ts';
import type { Translate } from '../dsh.ts';
/** Navigation chips for the units changed by a worktree. */
export declare function UnitChips(props: {
    readonly units: readonly ChangedUnit[];
    readonly selected: string | undefined;
    readonly t: Translate;
    readonly onSelect: (unitId: string) => void;
}): React.ReactElement | null;
/** Append a selected unit to an opaque Host Viewer target. */
export declare function unitViewerUrl(url: string | undefined, units: readonly ChangedUnit[], unitId: string | undefined, scope: 'worktree' | 'merge'): string | undefined;
//# sourceMappingURL=unit-chips.d.ts.map