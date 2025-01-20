export const juiceConfig = {
  preserveImportant: true,
  resolveCSSVariables: true,
};

export const htmlCombConfig = {
  whitelist: [],
  backend: [],
  uglify: true,
  removeHTMLComments: true,
  removeCSSComments: true,
  doNotRemoveHTMLCommentsWhoseOpeningTagContains: [
    '[if',
    '[endif',
  ],
  htmlCrushOpts: {
    removeLineBreaks: true,
    removeIndentations: true,
    removeHTMLComment: true,
    removeCSSComments: true,
    lineLengthLimit: 500,
  },
  reportProgressFunc: null,
  reportProgressFuncFrom: 0,
  reportProgressFuncTo: 100,
};

export const pngConvertConfig = {
  compressionLevel: 0,
  palette: true,
  progressive: true,
};
