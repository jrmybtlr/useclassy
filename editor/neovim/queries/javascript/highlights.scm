; UseClassy modifier attributes in JSX files using the javascript parser.
(jsx_attribute
  (property_identifier) @attribute.useclassy
  (#match? @attribute.useclassy "^class(Name)?:"))
