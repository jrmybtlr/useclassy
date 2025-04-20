# useClassy
useClassy enables simple seperation of your Tailwind variables. So, you can write clean classes faster and with less effort.

## WIP
While the code is complete, I'm still making the npm package and finalising tests.

## Tailwind Intellisense

This project uses a custom class variant syntax with Tailwind CSS. To enable proper validation and IntelliSense in VS Code, add the following configuration to your `.vscode/settings.json`:

```json
{
  "tailwindCSS.classAttributes": [
    ...other settings,
    "class:[\\w:-]*"
  ]
}
```

This configuration enables validation for all class variants including:
- Conditional classes (hover, dark mode)
- Responsive classes (sm, md, lg)
- Group variants
- Compound variants
