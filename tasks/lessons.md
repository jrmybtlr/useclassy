# Lessons

## JSX conditional class rewrites (2026-07-21)

- When rewriting string literals inside `className:modifier={…}`, never blindly prefix every quoted string.
- Comparison operands (`===` / `!==` / `==` / `!=`) and string method receivers (`'x'.includes`) must stay untouched.
- Always add a regression test for `status === 'active' ? 'bg-a' : 'bg-b'` when changing the JSX expression rewriter.
