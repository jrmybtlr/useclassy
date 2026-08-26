'use strict'

/** tsserver requires `module.exports = init`, not ESM default. */
const plugin = require('./typescript-plugin.cjs')
module.exports = plugin.default ?? plugin
