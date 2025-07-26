# Laravel UseClassy Demo

This demo showcases UseClassy integration with Laravel and Blade templates. UseClassy automatically transforms `class:modifier="value"` syntax into standard Tailwind classes.

## What UseClassy Does

UseClassy transforms this Blade syntax:
```blade
<h1 class="font-bold" 
    class:lg="text-2xl" 
    class:hover="text-blue-600"
>Hello World</h1>
```

Into this rendered HTML:
```html
<h1 class="font-bold lg:text-2xl hover:text-blue-600">Hello World</h1>
```

## Setup

1. **Install dependencies:**
```bash
npm install
composer install
```

2. **Environment setup:**
```bash
cp .env.example .env
php artisan key:generate
```

3. **Run development servers:**
```bash
# Terminal 1: Laravel server
php artisan serve

# Terminal 2: Vite dev server  
npm run dev
```

4. **Visit the demo:**
   - Laravel app: http://localhost:8000
   - Vite dev server: http://localhost:5173

## How It Works

1. **Automatic Setup**: When you configure the Vite plugin with `language: 'blade'`, it automatically:
   - Creates `app/Providers/UseClassyServiceProvider.php`
   - Registers the service provider in `bootstrap/providers.php`
   - No manual PHP setup required!

2. **Blade Transformation**: The service provider hooks into Laravel's Blade compiler to transform UseClassy syntax during template compilation.

3. **Vite Integration**: The Vite plugin:
   - Scans `.blade.php` files for UseClassy classes
   - Generates a `.classy/output.classy.html` file for Tailwind JIT
   - Watches for changes and triggers hot reloads

## Configuration

The Vite configuration in `vite.config.js`:

```javascript
import useClassy from 'vite-plugin-useclassy'

export default defineConfig({
  plugins: [
    useClassy({
      language: 'blade',  // Enables Laravel integration
      debug: true,        // Shows setup logs
    }),
    // ... other plugins
  ],
})
```

## Demo Features

The demo showcases:
- ✅ Responsive modifiers: `class:lg="text-2xl"`
- ✅ Hover states: `class:hover="underline"`  
- ✅ Dark mode: `class:dark="bg-gray-800"`
- ✅ Multiple modifiers on one element
- ✅ Hot reloading when editing Blade files
- ✅ Automatic Tailwind JIT compilation

## File Structure

```
demos/laravel/
├── app/Providers/
│   └── UseClassyServiceProvider.php  # Auto-generated
├── bootstrap/providers.php           # Auto-updated
├── resources/views/
│   └── welcome.blade.php             # Demo template
├── vite.config.js                    # UseClassy config
└── .classy/
    └── output.classy.html            # Generated classes
```

## Laravel Documentation

For more information about Laravel itself, see the [Laravel documentation](https://laravel.com/docs).