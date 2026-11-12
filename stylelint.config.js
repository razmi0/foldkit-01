/** @type {import("stylelint").Config} */
export default {
  rules: {
    // No element selectors (button, h1, footer, input…): style with classes only.
    // Keeps the app's CSS tied to its own markup, never to bare HTML tags.
    "selector-max-type": [
      0,
      { message: (selector) => `Use a class instead of an element selector: "${selector}"` },
    ],
  },
  overrides: [
    {
      // The host page owns <html>/<body>, so element selectors are allowed there.
      files: ["**/host.css"],
      rules: { "selector-max-type": null },
    },
  ],
};
