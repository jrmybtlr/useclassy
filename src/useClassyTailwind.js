module.exports = function classyPlugin(options)
{
    // If used as a Tailwind plugin
    return function (api)
    {
        const { addVariant, e } = api;

        addVariant('class', ({ modifySelectors, separator }) =>
        {
            modifySelectors(({ className }) =>
            {
                return `[class~="${e(`class${separator}${className}`)}"]`;
            });
        });
    };
}