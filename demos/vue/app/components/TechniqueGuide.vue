<template>
  <section class="mt-20 w-full min-w-0">
    <div class="text-center">
      <h2 class="font-serif text-4xl font-extralight tracking-tight">
        Techniques
      </h2>
      <p class="mx-auto mt-3 max-w-lg text-balance text-zinc-400">
        The same modifier idea across frameworks — hover the source to highlight
        the compiled Tailwind output.
      </p>
    </div>

    <SegmentedControl
      v-model="technique"
      aria-label="UseClassy technique"
      :options="techniqueOptions"
      class="mt-8 w-full"
    />

    <div class="mt-4 flex w-full flex-col gap-3">
      <Code>
        <div class="flex items-center border-b border-white/10 px-4">
          <button
            v-for="formatOption in formatOptions"
            :key="formatOption"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-3 cursor-pointer"
            :class="
              format === formatOption
                ? 'border-b-2 border-blue-500'
                : 'border-b-2 border-transparent text-zinc-400'
            "
            @click="format = formatOption"
          >
            <Icon
              :name="formatIcons[formatOption]"
              class="size-4 shrink-0 grayscale opacity-70"
            />
            {{ labelFor(formatOption) }}
          </button>
        </div>

        <code class="font-mono text-sm leading-relaxed">
          <div
            v-for="(line, index) in active.input"
            :key="`in-${index}`"
            class="transition-opacity duration-200"
            :class="{
              'cursor-pointer': line.group,
              'opacity-30': hoveredGroup && line.group && hoveredGroup !== line.group,
            }"
            @mouseenter="line.group && (hoveredGroup = line.group)"
            @mouseleave="hoveredGroup = null"
          >
            <span
              v-for="(token, tokenIndex) in line.tokens"
              :key="`in-${index}-${tokenIndex}`"
              :class="token.class"
            >{{ token.text }}</span>
          </div>
        </code>
      </Code>

      <Code>
        <div
          class="border-b border-white/10 px-5 py-2 text-xs uppercase tracking-[0.14em] text-zinc-500"
        >
          Compiles to
        </div>
        <code class="font-mono text-sm leading-relaxed">
          <div
            v-for="(line, index) in active.output"
            :key="`out-${index}`"
            class="transition-opacity duration-200"
            :class="{
              'opacity-30': hoveredGroup && line.group && hoveredGroup !== line.group,
            }"
          >
            <span
              v-for="(token, tokenIndex) in line.tokens"
              :key="`out-${index}-${tokenIndex}`"
              :class="token.class"
            >{{ token.text }}</span>
          </div>
        </code>
      </Code>

      <p class="text-sm leading-relaxed text-zinc-500">
        {{ active.note }}
      </p>

      <!-- Live preview only where CSS behavior is meaningful -->
      <div
        v-if="technique === 'static' || technique === 'chained'"
        class="mt-2 flex flex-col items-start gap-3 border border-white/10 bg-zinc-900/20 px-5 py-5"
      >
        <p class="text-xs uppercase tracking-[0.14em] text-zinc-500">
          Try it
        </p>
        <button
          v-if="technique === 'static'"
          type="button"
          class="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition"
          class:hover="bg-blue-500 scale-105"
          class:focus="outline-none ring-2 ring-blue-300 ring-offset-2 ring-offset-zinc-950"
          class:dark="bg-sky-700"
        >
          Hover · focus
        </button>
        <div
          v-else
          class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 text-zinc-300 transition"
          class:sm:hover="scale-105 text-sky-300"
        >
          Resize past <span class="text-zinc-100">sm</span>, then hover
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { DemoFormat } from "./ClassExample.vue";

type TechniqueId = "static" | "conditional" | "svelte-native" | "chained" | "arbitrary";

type Token = { text: string; class?: string };
type Line = { tokens: Token[]; group?: string };

type Snippet = {
  input: Line[];
  output: Line[];
  note: string;
};

const format = defineModel<DemoFormat>("format", { default: "vue" });

const technique = ref<TechniqueId>("static");
const hoveredGroup = ref<string | null>(null);

const formatOptions = ["vue", "react", "svelte", "blade"] as const;
const formatIcons: Record<DemoFormat, string> = {
  vue: "vscode-icons:file-type-vue",
  react: "vscode-icons:file-type-reactjs",
  svelte: "vscode-icons:file-type-svelte",
  blade: "vscode-icons:file-type-blade",
};

const techniqueOptions = computed(() => {
  const options: { value: TechniqueId; label: string }[] = [
    { value: "static", label: "Static" },
    { value: "chained", label: "Chained" },
    { value: "arbitrary", label: "Arbitrary" },
  ];

  if (format.value === "react") {
    options.splice(1, 0, { value: "conditional", label: "Conditional" });
  }
  if (format.value === "svelte") {
    options.splice(1, 0, { value: "svelte-native", label: "Native" });
  }

  return options;
});

watch(format, () => {
  const allowed = new Set(techniqueOptions.value.map((option) => option.value));
  if (!allowed.has(technique.value)) {
    technique.value = "static";
  }
  hoveredGroup.value = null;
});

watch(technique, () => {
  hoveredGroup.value = null;
});

function labelFor(formatOption: DemoFormat) {
  return formatOption.charAt(0).toUpperCase() + formatOption.slice(1);
}

function attr(formatOption: DemoFormat, modifier?: string): string {
  const base = formatOption === "react" ? "className" : "class";
  return modifier ? `${base}:${modifier}` : base;
}

function t(text: string, className = "text-zinc-300"): Token {
  return { text, class: className };
}

function attrToken(formatOption: DemoFormat, modifier?: string): Token {
  return t(attr(formatOption, modifier), "text-blue-400");
}

function quoted(value: string): Token[] {
  return [t('="', "text-zinc-500"), t(value, "text-zinc-300"), t('"', "text-zinc-500")];
}

function line(tokens: Token[], group?: string): Line {
  return { tokens, group };
}

function staticSnippet(formatOption: DemoFormat): Snippet {
  return {
    input: [
      line([attrToken(formatOption), ...quoted("rounded px-4 py-2 bg-blue-600 text-white")], "base"),
      line([attrToken(formatOption, "hover"), ...quoted("bg-blue-500 scale-105")], "hover"),
      line([attrToken(formatOption, "focus"), ...quoted("ring-2 ring-blue-300")], "focus"),
      line([attrToken(formatOption, "md"), ...quoted("px-6 text-lg")], "md"),
    ],
    output: [
      line(
        [
          attrToken(formatOption),
          t('="', "text-zinc-500"),
          t("rounded px-4 py-2 bg-blue-600 text-white", "text-zinc-300"),
          t(" hover:bg-blue-500 hover:scale-105", "text-emerald-400"),
          t(" focus:ring-2 focus:ring-blue-300", "text-sky-300"),
          t(" md:px-6 md:text-lg", "text-amber-300"),
          t('"', "text-zinc-500"),
        ],
        "base",
      ),
    ],
    note: "Put base utilities on class / className. Group the rest by modifier so each state reads as its own line.",
  };
}

function conditionalSnippet(): Snippet {
  return {
    input: [
      line([attrToken("react"), ...quoted("rounded px-4 py-2")], "base"),
      line(
        [
          attrToken("react", "hover"),
          t("={", "text-zinc-500"),
          t("isActive", "text-orange-300"),
          t(" ? ", "text-zinc-500"),
          t("'bg-blue-500 text-white'", "text-emerald-400"),
          t(" : ", "text-zinc-500"),
          t("'bg-zinc-700'", "text-emerald-400"),
          t("}", "text-zinc-500"),
        ],
        "hover",
      ),
      line(
        [
          attrToken("react", "disabled"),
          t("={", "text-zinc-500"),
          t("isDisabled", "text-orange-300"),
          t(" && ", "text-zinc-500"),
          t("'opacity-50 cursor-not-allowed'", "text-emerald-400"),
          t("}", "text-zinc-500"),
        ],
        "disabled",
      ),
    ],
    output: [
      line(
        [
          attrToken("react"),
          t("={`", "text-zinc-500"),
          t("rounded px-4 py-2", "text-zinc-300"),
          t(" ", "text-zinc-500"),
          t("${", "text-zinc-500"),
          t("(isActive ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-zinc-700') || ''", "text-emerald-400"),
          t("}", "text-zinc-500"),
          t(" ", "text-zinc-500"),
          t("${", "text-zinc-500"),
          t("(isDisabled && 'disabled:opacity-50 disabled:cursor-not-allowed') || ''", "text-amber-300"),
          t("}", "text-zinc-500"),
          t("`}", "text-zinc-500"),
        ],
        "base",
      ),
    ],
    note: "React can prefix string literals inside JSX expressions. Comparison operands and string method receivers stay untouched.",
  };
}

function svelteNativeSnippet(): Snippet {
  return {
    input: [
      line([attrToken("svelte"), ...quoted("rounded px-4")], "base"),
      line([attrToken("svelte", "hover"), ...quoted("bg-emerald-600 text-white")], "hover"),
      line(
        [
          t("class:loading", "text-violet-300"),
          t("={", "text-zinc-500"),
          t("isLoading", "text-orange-300"),
          t("}", "text-zinc-500"),
        ],
        "native",
      ),
    ],
    output: [
      line(
        [
          attrToken("svelte"),
          t('="', "text-zinc-500"),
          t("rounded px-4", "text-zinc-300"),
          t(" hover:bg-emerald-600 hover:text-white", "text-emerald-400"),
          t('"', "text-zinc-500"),
        ],
        "base",
      ),
      line(
        [
          t("class:loading", "text-violet-300"),
          t("={", "text-zinc-500"),
          t("isLoading", "text-orange-300"),
          t("}", "text-zinc-500"),
        ],
        "native",
      ),
    ],
    note: "Quoted class:hover=\"…\" is UseClassy. Native Svelte class:loading={…} and shorthand class:active stay as directives.",
  };
}

function chainedSnippet(formatOption: DemoFormat): Snippet {
  return {
    input: [
      line([attrToken(formatOption), ...quoted("rounded px-4")], "base"),
      line([attrToken(formatOption, "sm:hover"), ...quoted("underline text-sky-300")], "chain"),
    ],
    output: [
      line(
        [
          attrToken(formatOption),
          t('="', "text-zinc-500"),
          t("rounded px-4", "text-zinc-300"),
          t(" sm:hover:underline sm:hover:text-sky-300", "text-emerald-400"),
          t(" sm:underline sm:text-sky-300", "text-amber-300"),
          t(" hover:underline hover:text-sky-300", "text-sky-300"),
          t('"', "text-zinc-500"),
        ],
        "chain",
      ),
    ],
    note: "Chained modifiers are additive: sm:hover expands to the full chain plus each part. Keep exact sm:hover:… tokens in the base string when you need behavior-preserving refactors.",
  };
}

function arbitrarySnippet(formatOption: DemoFormat): Snippet {
  return {
    input: [
      line(
        [
          attrToken(formatOption),
          t('="', "text-zinc-500"),
          t("space-y-2 ", "text-zinc-300"),
          t("[&>*]:rounded", "text-rose-300"),
          t('"', "text-zinc-500"),
        ],
        "base",
      ),
      line([attrToken(formatOption, "hover"), ...quoted("bg-zinc-50")], "hover"),
    ],
    output: [
      line(
        [
          attrToken(formatOption),
          t('="', "text-zinc-500"),
          t("space-y-2 ", "text-zinc-300"),
          t("[&>*]:rounded", "text-rose-300"),
          t(" hover:bg-zinc-50", "text-emerald-400"),
          t('"', "text-zinc-500"),
        ],
        "base",
      ),
    ],
    note: "Arbitrary variant prefixes cannot become attribute names. Leave [&>*]:… in the base attribute and still use UseClassy for normal modifiers.",
  };
}

const active = computed((): Snippet => {
  const formatOption = format.value;
  switch (technique.value) {
    case "conditional":
      return conditionalSnippet();
    case "svelte-native":
      return svelteNativeSnippet();
    case "chained":
      return chainedSnippet(formatOption);
    case "arbitrary":
      return arbitrarySnippet(formatOption);
    default:
      return staticSnippet(formatOption);
  }
});
</script>
