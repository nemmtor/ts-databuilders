# 🧱 TS DataBuilders
DataBuilder Generator is a lightweight CLI tool that automatically generates builder classes from annotated TypeScript types.
Just add a @DataBuilder JSDoc tag, run one command, and get a fully-typed builder ready to use in your tests or factories.

Built with [Effect](https://effect.website/).

[Read about TS DataBuilders.](http://www.natpryce.com/articles/000714.html)

## 🚀 Features
- 🔍 Scans your repo for specific pattern to understand what builders to build
- ⚡ Generates builder classes with fluent withX() methods and sensible defaults
- 🧩 Type-safe — builders are generated directly from your TypeScript types
- 🧠 Fast and Memory-efficient — processes files asynchronously and incrementally via streams
- 🛠️ Pluggable — works with any TypeScript project layout
