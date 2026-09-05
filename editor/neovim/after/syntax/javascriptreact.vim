" UseClassy modifier attributes in JSX (className:hover, …)
if exists('b:current_syntax')
  syn match useclassyModifierAttr '\<\%(className\|class\):\%([^ \t=]\|\[[^]]*\]\)\+'
  hi def link useclassyModifierAttr jsxAttr
endif
