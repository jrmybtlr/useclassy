" UseClassy modifier attributes in TSX (className:hover, className:@md, className:[&>*], …)
" Loaded after built-in TSX syntax when this folder is on &runtimepath.
if exists('b:current_syntax')
  syn match useclassyModifierAttr '\<\%(className\|class\):\%([^ \t=]\|\[[^]]*\]\)\+'
  hi def link useclassyModifierAttr jsxAttr
endif
