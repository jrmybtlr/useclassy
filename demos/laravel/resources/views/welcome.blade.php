<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Laravel</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="bg-gray-900 text-white flex p-6 items-center min-h-screen flex-col" class:dark="bg-neutral-950 text-white"
    class:lg="p-8 justify-center">

    <div
        class="flex items-center justify-center w-full transition-opacity opacity-100 duration-750 lg:grow starting:opacity-0">
        <main class="max-w-screen-sm flex-1 p-6 pb-12 lg:p-20 rounded-xl bg-white" class:dark="bg-neutral-900">
            <h1 class="mb-1 font-medium" class:lg="text-3xl">Let's get started with UseClassy</h1>
            <p class="mt-4 text-[#706f6c]" class:dark="text-gray-400">
                Laravel has an incredibly rich ecosystem.
                <span class="font-semibold" class:hover="underline" class:dark="text-neutral-400">UseClassy makes
                    Tailwind even better!</span>
            </p>
        </main>
    </div>
</body>

</html>