<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\View\Compilers\BladeCompiler;

class UseClassyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Hook into Blade compilation to transform class:modifier syntax
        $this->app->resolving('blade.compiler', fn (BladeCompiler $bladeCompiler) => 
            $bladeCompiler->extend(fn ($value) => $this->transformUseClassySyntax($value))
        );
    }

    private function transformUseClassySyntax(string $value): string
    {
        // Step 1: Transform class:modifier="value" to the modifier classes
        $pattern = '/\bclass:(\w+)=(["'])([^"']*)\2/';
        
        $value = preg_replace_callback($pattern, function ($matches) {
            $modifier = $matches[1];
            $classes = $matches[3];
            
            // Transform each class with the modifier prefix
            $transformedClasses = [];
            foreach (explode(' ', trim($classes)) as $class) {
                if (!empty($class)) {
                    $transformedClasses[] = "{$modifier}:{$class}";
                }
            }
            
            $modifierClasses = implode(' ', $transformedClasses);
            
            // Return as a temporary marker to be merged later
            return "__USECLASSY_MODIFIER__{$modifierClasses}__USECLASSY_END__";
        }, $value);
        
        // Step 2: Find elements with both class attributes and modifier markers, then merge them
        $value = preg_replace_callback(
            '/(<[^>]*)\bclass=(["'])([^"']*)\2([^>]*__USECLASSY_MODIFIER__[^>]*>)/',
            fn ($matches) => (function () use ($matches) {
                $beforeClass = $matches[1];
                $quote = $matches[2];
                $existingClasses = $matches[3];
                $afterClass = $matches[4];
                
                // Extract all modifier classes from this element
                preg_match_all('/__USECLASSY_MODIFIER__([^_]*)__USECLASSY_END__/', $afterClass, $modifierMatches);
                $allModifierClasses = implode(' ', $modifierMatches[1]);
                
                // Remove the modifier markers
                $cleanAfterClass = preg_replace('/__USECLASSY_MODIFIER__[^_]*__USECLASSY_END__/', '', $afterClass);
                
                // Combine existing and modifier classes
                $combinedClasses = trim("{$existingClasses} {$allModifierClasses}");
                
                return "{$beforeClass}class={$quote}{$combinedClasses}{$quote}{$cleanAfterClass}";
            })(),
            $value
        );
        
        // Step 3: Handle any remaining modifier markers (elements without existing class attributes)
        $value = preg_replace_callback(
            '/__USECLASSY_MODIFIER__([^_]*)__USECLASSY_END__/',
            fn ($matches) => "class=\"{$matches[1]}\"",
            $value
        );
        
        return $value;
    }
}
