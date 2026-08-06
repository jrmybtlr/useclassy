# UseClassy refactoring examples

## Vue: group static variants

```html
<!-- Before -->
<div
  class="rounded-lg p-4 bg-white hover:shadow-lg sm:p-6 dark:bg-zinc-900 dark:text-zinc-100"
  :class="{ active: isActive }"
>

<!-- After -->
<div
  class="rounded-lg p-4 bg-white"
  class:hover="shadow-lg"
  class:sm="p-6"
  class:dark="bg-zinc-900 text-zinc-100"
  :class="{ active: isActive }"
>
```

Leave exact chained variants in the base attribute unless additive chained behavior is wanted:

```html
<div
  class="rounded-lg sm:hover:shadow-xl"
  class:hover="shadow-lg"
  class:sm="p-6"
>
```

Do not alter Vue dynamic bindings:

```html
<div
  class="base"
  :class="{ active: isActive }"
  class:hover="opacity-90"
>
```

## React: preserve expressions

```tsx
// Before
<button
  className={`rounded px-4 hover:bg-blue-600 focus:ring-2 ${active ? 'font-bold' : ''}`}
>
  Save
</button>

// After: only move safely separable static variants.
<button
  className={`rounded px-4 ${active ? 'font-bold' : ''}`}
  className:hover="bg-blue-600"
  className:focus="ring-2"
>
  Save
</button>
```

If moving tokens safely would require rewriting expression logic, leave the expression unchanged. UseClassy modifier attributes are not a replacement for `clsx`, `classy`, or conditional expressions.

## Svelte: preserve native directives

```svelte
<!-- Before -->
<button
  class="rounded px-4 hover:bg-emerald-600 hover:text-white"
  class:loading={isLoading}
>
  Submit
</button>

<!-- After -->
<button
  class="rounded px-4"
  class:hover="bg-emerald-600 text-white"
  class:loading={isLoading}
>
  Submit
</button>
```

`class:loading={isLoading}` is native Svelte and must not be converted to a string attribute.

## Blade

```blade
{{-- Before --}}
<a
  href="{{ $url }}"
  class="font-medium text-zinc-700 hover:text-zinc-900 hover:underline md:text-lg"
>
  {{ $label }}
</a>

{{-- After --}}
<a
  href="{{ $url }}"
  class="font-medium text-zinc-700"
  class:hover="text-zinc-900 underline"
  class:md="text-lg"
>
  {{ $label }}
</a>
```

## Chained modifiers are additive

```html
<!-- This is intentionally additive, not equivalent to only dark:focus:ring-sky-400 -->
<input class:dark:focus="ring-sky-400" />

<!-- Generated classes include: -->
<input class="dark:focus:ring-sky-400 dark:ring-sky-400 focus:ring-sky-400" />
```

To preserve an existing exact chained variant, keep it in the base string:

```html
<input class="border dark:focus:ring-sky-400" class:focus="outline-none ring-2" />
```

## Unsupported arbitrary variant prefix

Keep arbitrary variants in the base attribute because their prefix cannot be used as an attribute name:

```html
<ul class="space-y-2 [&>*]:rounded" class:hover="bg-zinc-50">
  ...
</ul>
```
