module.exports = function classyPlugin(options)
{
    // If used as a DOM utility
    if (options && options.element) {
        const element = options.element;

        // Use getAttributeNames if available, otherwise fallback to element.attributes
        const attributes = element.getAttributeNames
            ? element.getAttributeNames()
            : Array.from(element.attributes).map(attr => attr.name);

        // Start with the base class if it exists
        const classes = [element.getAttribute('class')].filter(Boolean);

        // Find all class: prefixed attributes and transform them
        attributes
            .filter(attr => attr.startsWith('class:'))
            .forEach(attr =>
            {
                const modifier = attr.replace('class:', '');
                const value = element.getAttribute(attr);
                classes.push(`${modifier}:${value}`);
            });

        return classes.join(' ');
    }

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