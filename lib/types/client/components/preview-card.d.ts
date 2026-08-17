import * as React from 'react';
import type { Translate } from '../dsh.ts';
import type { UniverTarget } from '../conversation/univer-target-definition.ts';
/** Turn-tail preview card for files touched by Univer tools. */
export declare function PreviewCard(props: {
    readonly sessionId: string;
    readonly matched: {
        readonly targets: readonly UniverTarget[];
    };
    readonly t: Translate;
}): React.ReactElement;
//# sourceMappingURL=preview-card.d.ts.map