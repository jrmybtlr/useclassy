<template>
  <div
    class="min-h-screen gap-8 py-4"
    class:md="py-12"
    class:dark="bg-zinc-950 text-white"
  >
    <div
      class="container mx-auto flex flex-col items-center max-w-2xl w-screen overflow-clip"
    >
      <!-- Title -->
      <section>
        <div class="text-white flex items-center -space-x-[8%] group">
          <div
            class="text-[140px] rotate-0 transition-transform duration-300 motion-preset-blur-up motion-delay-500 z-10"
            class:md="text-[170px]"
            class:group-hover="-rotate-6 -translate-y-8"
            class:hover="rotate-12 -translate-y-4"
          >
            🎩
          </div>
          <div
            class="font-serif flex flex-col items-start font-extralight tracking-tight"
            class:max-md="text-6xl"
            class:md="text-7xl"
            class:lg="text-8xl"
          >
            <div class="motion-preset-blur-up">Use</div>
            <div class="motion-preset-blur-up motion-delay-300">Classy</div>
          </div>
        </div>
      </section>

      <!-- Example -->
      <section class="mt-2">
        <p
          class="text-center font-semibold text-2xl motion-preset-blur-up motion-delay-600 text-balance"
          class:md="text-3xl mt-2"
        >
          Make your Tailwind variants fast, simple, and much more readable.
        </p>
        <ClassExample :examples="classExamples" class="mt-10" />
      </section>

      <div class="relative w-full">
        <div
          class="h-full w-[1px] absolute left-3 top-16 bg-gradient-to-b from-zinc-800 to-transparent"
        />
        <!-- Install -->
        <Step :number="1" title="Install">
          <Code class="mt-6 w-full" showCopy>
            <code> npm install vite-plugin-useclassy --save-dev </code>
          </Code>
        </Step>

        <!-- Vite -->
        <Step
          :number="2"
          title="Vite"
          description="Add the following to your Vite configuration, making sure UseClassy is listed as the first plugin."
        >
          <Code class="mt-6 w-full text-zinc-500" showCopy>
            <code>
              <div class="text-white">
                import useClassy from 'vite-plugin-useclassy';
              </div>
              <div>{</div>
              <div>
                <div class="ml-4">
                  <div class="ml-4">plugins: [</div>
                  <div class="ml-8 text-white">useClassy({</div>
                  <div class="ml-12 text-white">language: 'vue',</div>
                  <div class="ml-8 text-white">}),</div>
                  <div class="ml-8">// ... other plugins</div>
                  <div class="ml-4">],</div>
                </div>
              </div>
              <div>}</div>
            </code>
          </Code>
        </Step>

        <!-- Tailwind CSS -->
        <Step
          :number="3"
          title="Tailwind"
          description="UseClassy creates a ./.classy/output.classy.html file. Import this file into your Tailwind CSS configuration."
        >
          <Code class="mt-6 w-full text-zinc-500" showCopy>
            <code>
              <div>{</div>
              <div>
                <div class="ml-4">
                  <div class="ml-4">@import "tailwindcss";</div>
                  <div class="ml-4">...update to your file location</div>
                  <div class="ml-4 text-white">
                    @source ".classy/output.classy.html";
                  </div>
                  <div class="ml-4">...other config</div>
                </div>
              </div>
              <div>}</div>
            </code>
          </Code>

          <p class="mt-8">
            For Tailwind 3, add the following to your Tailwind config.
            <Code class="mt-4">
              <code>
                <div class="text-zinc-500">content: [</div>
                <div class="ml-4 text-zinc-500">// ... other content paths</div>
                <div class="ml-4">".classy/output.classy.html"</div>
                <div class="text-zinc-500">]</div>
              </code>
            </Code>
          </p></Step
        >

        <!-- Intellisense -->
        <Step
          :number="4"
          title="Intellisense"
          description="Add the following to your VSCode settings to enable IntelliSense for UseClassy."
        >
          <Code class="mt-6 w-full text-zinc-500" showCopy>
            <code>
              <div>{</div>
              <div>
                <div class="ml-4">"tailwindCSS.classAttributes": [</div>
                <div class="ml-8">...other settings,</div>
                <div class="ml-8 text-white">"class:[\\w:-]*",</div>
                <div class="ml-4">]</div>
              </div>
              <div>}</div>
            </code>
          </Code>
        </Step>
      </div>

      <footer class="mt-24 w-full text-sm flex justify-center">
        <a
          href="https://github.com/jrmybtlr/useclassy"
          class="mx-auto text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <svg
            viewBox="0 0 98 96"
            class="w-6 h-6"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              fill="currentColor"
            />
          </svg>
        </a>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "UseClassy",
  description:
    "Make your Tailwind variant modifiers fast, simple, and much more readable.",
  ogTitle: "UseClassy",
  ogDescription:
    "Make your Tailwind variant modifiers fast, simple, and much more readable.",
  ogImage: "https://assets.useclassy.com/og-image.png",
  ogUrl: "https://useclassy.com",
  twitterTitle: "UseClassy",
  twitterDescription:
    "Make your Tailwind variant modifiers fast, simple, and much more readable.",
  twitterImage: "https://assets.useclassy.com/og-image-twitter.png",
  twitterCard: "summary_large_image",
});

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon.png",
    },
  ],
});

const classExamples = {
  // Base styles
  base: "p-6 bg-white rounded-xl shadow-lg border",

  // Interactive states
  hover: "bg-blue-50 scale-105 shadow-xl",
  focus: "ring-2 ring-blue-500 ring-offset-2",

  // Dark mode
  dark: "bg-zinc-800 text-white border-zinc-700",

  // Responsive design
  lg: "p-6 text-base mt-4",

  // Group interactions
  "group-hover": "bg-blue-100 shadow-lg border-blue-200",
  "focus-within": "ring-2 ring-blue-500",

  // Arbitrary values
  "[&>svg]": "size-6 fill-blue-700 stroke-blue-700",
  "dark:[&>svg]": "fill-blue-200 stroke-blue-200",

  // Complex selectors
  "[&:has(>svg)]": "pl-10 pr-2 fill-blue-500",
  "[&:not(:has(>svg))]": "pl-4 pr-3 text-zinc-100 underline",
};
</script>
