/** Preview-card and fullscreen-dialog styles. */
export const previewStyles = `
.unvT_card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:12px;margin:8px 0 4px;overflow:hidden}
.unvT_head{padding:10px 12px;cursor:pointer}.unvT_head:hover{background:var(--dsw-alias-interactive-bg-subtle)}
.unvT_titleRow,.unvT_title,.unvT_actions,.unvT_panelHead,.unvT_panelTitle,.unvT_panelActions{display:flex;align-items:center;gap:8px;min-width:0}
.unvT_title,.unvT_panelTitle{flex:1;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}.unvT_file,.unvT_panelFile{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.unvT_wt,.unvT_panelWt{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;background:var(--dsw-alias-interactive-bg-subtle);border-radius:999px;padding:1px 8px}
.unvT_path{color:var(--dsw-alias-label-tertiary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.unvT_dot{width:10px;height:10px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:#c4c9d2;display:inline-block;flex:none}.unvT_dot[data-gateway=running]{background:#22a06b;border-color:#22a06b}.unvT_dot[data-gateway=stopped],.unvT_dot[data-gateway=failed]{background:#d9a13b;border-color:#d9a13b;cursor:pointer}.unvT_dot[data-gateway=checking],.unvT_dot[data-gateway=starting]{border-top-color:#22a06b;background:transparent;animation:unvT_spin .9s linear infinite}@keyframes unvT_spin{to{transform:rotate(360deg)}}
.unvT_expandBtn,.unvT_panelTool{font:13px/20px inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:var(--dsw-alias-interactive-bg-subtle);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 10px}.unvT_actions{margin-left:auto}
.unvT_overlay{position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center}.unvT_mask{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}
.unvT_panel{position:relative;z-index:1;width:min(1280px,calc(100vw - 48px));height:min(860px,calc(100vh - 64px));border-radius:16px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv3);display:flex;flex-direction:column}.unvT_panelHead{padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base)}.unvT_frame{flex:1;min-height:0;width:100%;border:0;background:#fff}
`
